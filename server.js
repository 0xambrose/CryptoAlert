require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const CoinGecko = require('./coingecko');
const Database = require('./database');
const AlertManager = require('./alerts');
const EmailService = require('./emailService');
const Logger = require('./logger');
const config = require('./config');

// Validate configuration
const configErrors = config.validate();
if (configErrors.length > 0) {
    Logger.error('Configuration validation failed:', configErrors);
    process.exit(1);
}

// Print configuration in development
if (config.isDevelopment()) {
    config.print();
}

const app = express();

// Initialize services
const coinGecko = new CoinGecko();
const database = new Database();
const emailService = new EmailService();
const alertManager = new AlertManager(database, coinGecko, emailService);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
if (config.rateLimiting.enabled) {
    const limiter = rateLimit({
        windowMs: config.rateLimiting.windowMs,
        max: config.rateLimiting.maxRequests,
        message: {
            error: 'Too many requests, please try again later',
            retryAfter: Math.ceil(config.rateLimiting.windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api/', limiter);
    Logger.info(`Rate limiting enabled: ${config.rateLimiting.maxRequests} requests per ${config.rateLimiting.windowMs / 1000 / 60} minutes`);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', async (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('./package.json').version,
        services: {
            database: 'unknown',
            email: config.email.enabled ? 'configured' : 'disabled',
            api: 'unknown'
        }
    };

    try {
        // Check database
        await new Promise((resolve, reject) => {
            database.db.get('SELECT 1', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        healthCheck.services.database = 'healthy';
    } catch (error) {
        healthCheck.services.database = 'unhealthy';
        healthCheck.status = 'degraded';
    }

    try {
        // Check CoinGecko API
        await coinGecko.getPrice('bitcoin');
        healthCheck.services.api = 'healthy';
    } catch (error) {
        healthCheck.services.api = 'unhealthy';
        healthCheck.status = 'degraded';
    }

    const httpStatus = healthCheck.status === 'OK' ? 200 : 503;
    res.status(httpStatus).json(healthCheck);
});

// Get current price for a coin
app.get('/api/price/:coinId', async (req, res) => {
    try {
        const { coinId } = req.params;
        const priceData = await coinGecko.getPrice(coinId);

        if (!priceData) {
            return res.status(404).json({ error: 'Coin not found' });
        }

        res.json({
            coin: coinId,
            price: priceData.price,
            change24h: priceData.change24h
        });
    } catch (error) {
        Logger.error(`Failed to fetch price for ${coinId}`, error);
        res.status(500).json({ error: 'Failed to fetch price' });
    }
});

// Get list of supported coins
app.get('/api/coins', async (req, res) => {
    try {
        const coins = await coinGecko.getCoins();
        res.json(coins.slice(0, 100)); // Return first 100 coins
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coins list' });
    }
});

// Create a new alert
app.post('/api/alerts', async (req, res) => {
    try {
        const { coinId, coinName, targetPrice, condition, email } = req.body;

        if (!coinId || !coinName || !targetPrice || !condition || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['above', 'below'].includes(condition)) {
            return res.status(400).json({ error: 'Condition must be "above" or "below"' });
        }

        const result = await alertManager.createAlert(coinId, coinName, targetPrice, condition, email);
        Logger.info(`Alert created for ${coinName} by ${email}`, { alertId: result.id, targetPrice, condition });
        res.status(201).json({ message: 'Alert created', alertId: result.id });
    } catch (error) {
        Logger.error('Failed to create alert', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// Get active alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await alertManager.getActiveAlerts();
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Deactivate an alert
app.delete('/api/alerts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await alertManager.deactivateAlert(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ message: 'Alert deactivated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to deactivate alert' });
    }
});

// Get price history for a coin
app.get('/api/history/:coinId', async (req, res) => {
    try {
        const { coinId } = req.params;
        const limit = parseInt(req.query.limit) || 100;

        const history = await alertManager.getPriceHistory(coinId, limit);
        res.json(history);
    } catch (error) {
        Logger.error(`Failed to fetch price history for ${req.params.coinId}`, error);
        res.status(500).json({ error: 'Failed to fetch price history' });
    }
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email address required' });
        }

        await emailService.sendTestEmail(email);
        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        Logger.error('Failed to send test email', error);
        res.status(500).json({ error: error.message || 'Failed to send test email' });
    }
});

// Schedule alert checking with configurable interval
cron.schedule(config.alerts.checkInterval, () => {
    Logger.info('Running scheduled alert check');
    alertManager.checkAlerts();
});

// Global error handler
app.use((error, req, res, next) => {
    Logger.error('Unhandled error', error);
    res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.port, () => {
    Logger.info(`CryptoAlert server started on port ${config.port}`);
    Logger.info(`Alert checker scheduled with interval: ${config.alerts.checkInterval}`);
    Logger.info(`Email notifications: ${config.email.enabled ? 'enabled' : 'disabled'}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    Logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close((err) => {
        if (err) {
            Logger.error('Error during server close:', err);
            process.exit(1);
        }

        Logger.info('Server closed successfully');

        // Close database connection
        database.close();

        Logger.info('Graceful shutdown completed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        Logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
    Logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});