class AlertManager {
    constructor(database, coinGecko, emailService = null) {
        this.db = database.db;
        this.coinGecko = coinGecko;
        this.emailService = emailService;
    }

    // Create a new alert
    createAlert(coinId, coinName, targetPrice, condition, email) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO alerts (coin_id, coin_name, target_price, condition, email)
                VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run([coinId, coinName, targetPrice, condition, email], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
            stmt.finalize();
        });
    }

    // Get all active alerts
    getActiveAlerts() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM alerts
                WHERE is_active = 1 AND triggered_at IS NULL
                ORDER BY created_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get alerts for a specific coin
    getAlertsByCoin(coinId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM alerts
                WHERE coin_id = ? AND is_active = 1
                ORDER BY created_at DESC
            `, [coinId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Deactivate an alert
    deactivateAlert(alertId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE alerts SET is_active = 0 WHERE id = ?
            `, [alertId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Mark alert as triggered
    triggerAlert(alertId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE alerts SET triggered_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [alertId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Record price history
    recordPriceHistory(coinId, price) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO price_history (coin_id, price)
                VALUES (?, ?)
            `, [coinId, price], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    // Get price history for a coin
    getPriceHistory(coinId, limit = 100) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM price_history
                WHERE coin_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `, [coinId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Check all active alerts and trigger if needed
    async checkAlerts() {
        try {
            const alerts = await this.getActiveAlerts();

            if (alerts.length === 0) {
                return;
            }

            // Get unique coin IDs
            const coinIds = [...new Set(alerts.map(alert => alert.coin_id))];

            // Fetch current prices
            const prices = await this.coinGecko.getPrices(coinIds);

            // Record price history for all fetched coins
            for (const coinId of coinIds) {
                const price = prices[coinId]?.usd;
                if (price) {
                    try {
                        await this.recordPriceHistory(coinId, price);
                    } catch (error) {
                        console.error(`Failed to record price history for ${coinId}:`, error);
                    }
                }
            }

            // Check each alert
            for (const alert of alerts) {
                const currentPrice = prices[alert.coin_id]?.usd;

                if (!currentPrice) continue;

                let shouldTrigger = false;

                if (alert.condition === 'above' && currentPrice >= alert.target_price) {
                    shouldTrigger = true;
                } else if (alert.condition === 'below' && currentPrice <= alert.target_price) {
                    shouldTrigger = true;
                }

                if (shouldTrigger) {
                    await this.triggerAlert(alert.id);
                    console.log(`Alert triggered for ${alert.coin_name}: ${currentPrice} (target: ${alert.target_price})`);

                    // Send email notification if email service is available
                    if (this.emailService) {
                        await this.emailService.sendAlertEmail(alert, currentPrice);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking alerts:', error);
        }
    }
}

module.exports = AlertManager;