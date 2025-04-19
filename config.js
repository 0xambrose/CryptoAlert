const path = require('path');

class Config {
    constructor() {
        this.port = process.env.PORT || 3000;
        this.nodeEnv = process.env.NODE_ENV || 'development';

        // Database configuration
        this.database = {
            path: process.env.DB_PATH || path.join(__dirname, 'crypto_alert.sqlite'),
            maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10
        };

        // CoinGecko API configuration
        this.api = {
            coingecko: {
                baseUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
                timeout: parseInt(process.env.API_TIMEOUT) || 10000,
                retries: parseInt(process.env.API_RETRIES) || 3
            }
        };

        // Email configuration
        this.email = {
            enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            smtp: {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        // Alert checking configuration
        this.alerts = {
            checkInterval: process.env.ALERT_CHECK_INTERVAL || '*/5 * * * *', // Every 5 minutes
            maxAlertsPerUser: parseInt(process.env.MAX_ALERTS_PER_USER) || 10,
            maxPriceHistory: parseInt(process.env.MAX_PRICE_HISTORY) || 1000
        };

        // Rate limiting
        this.rateLimiting = {
            enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
        };

        // Logging
        this.logging = {
            level: process.env.LOG_LEVEL || (this.nodeEnv === 'production' ? 'info' : 'debug')
        };
    }

    isDevelopment() {
        return this.nodeEnv === 'development';
    }

    isProduction() {
        return this.nodeEnv === 'production';
    }

    validate() {
        const errors = [];

        if (!this.port || this.port < 1 || this.port > 65535) {
            errors.push('Invalid PORT value');
        }

        if (this.email.enabled) {
            if (!this.email.smtp.host) {
                errors.push('SMTP_HOST is required when email is enabled');
            }
            if (!this.email.smtp.user) {
                errors.push('SMTP_USER is required when email is enabled');
            }
            if (!this.email.smtp.pass) {
                errors.push('SMTP_PASS is required when email is enabled');
            }
        }

        return errors;
    }

    print() {
        console.log('Configuration:');
        console.log(`  Environment: ${this.nodeEnv}`);
        console.log(`  Port: ${this.port}`);
        console.log(`  Database: ${this.database.path}`);
        console.log(`  Email enabled: ${this.email.enabled}`);
        console.log(`  Rate limiting: ${this.rateLimiting.enabled}`);
        console.log(`  Alert check interval: ${this.alerts.checkInterval}`);
    }
}

module.exports = new Config();