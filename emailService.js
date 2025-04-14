const nodemailer = require('nodemailer');
const Logger = require('./logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    initTransporter() {
        // Check if SMTP settings are configured
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            Logger.warn('SMTP not configured. Email notifications disabled.');
            return;
        }

        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Verify connection
        this.transporter.verify((error, success) => {
            if (error) {
                Logger.error('SMTP configuration error:', error);
            } else {
                Logger.info('SMTP server ready for sending emails');
            }
        });
    }

    async sendAlertEmail(alert, currentPrice) {
        if (!this.transporter) {
            Logger.warn('Email service not configured, skipping email notification');
            return false;
        }

        const subject = `🚨 Price Alert: ${alert.coin_name}`;
        const conditionText = alert.condition === 'above' ? 'exceeded' : 'dropped below';
        const emoji = alert.condition === 'above' ? '📈' : '📉';

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                <h1>CryptoAlert ${emoji}</h1>
                <p>Your price alert has been triggered!</p>
            </div>

            <div style="padding: 20px; background: #f8f9fa;">
                <h2 style="color: #333; margin-bottom: 20px;">Alert Details</h2>

                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p><strong>Cryptocurrency:</strong> ${alert.coin_name}</p>
                    <p><strong>Current Price:</strong> $${currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 8})}</p>
                    <p><strong>Target Price:</strong> $${alert.target_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 8})}</p>
                    <p><strong>Condition:</strong> Price ${conditionText} target</p>
                    <p><strong>Alert Created:</strong> ${new Date(alert.created_at).toLocaleDateString()}</p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <p style="color: #666; font-size: 14px;">
                        This alert has been automatically disabled.<br>
                        Visit your CryptoAlert dashboard to create new alerts.
                    </p>
                </div>
            </div>

            <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                <p>CryptoAlert - Cryptocurrency Price Monitoring</p>
            </div>
        </div>`;

        const textContent = `
CryptoAlert - Price Alert Triggered!

${alert.coin_name} has ${conditionText} your target price.

Current Price: $${currentPrice}
Target Price: $${alert.target_price}
Condition: Price ${conditionText} target
Alert Created: ${new Date(alert.created_at).toLocaleDateString()}

This alert has been automatically disabled.
        `;

        try {
            const info = await this.transporter.sendMail({
                from: `"CryptoAlert" <${process.env.SMTP_USER}>`,
                to: alert.email,
                subject: subject,
                text: textContent,
                html: htmlContent
            });

            Logger.info(`Email sent to ${alert.email}`, { messageId: info.messageId });
            return true;
        } catch (error) {
            Logger.error('Failed to send email notification:', error);
            return false;
        }
    }

    async sendTestEmail(toEmail) {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        try {
            const info = await this.transporter.sendMail({
                from: `"CryptoAlert" <${process.env.SMTP_USER}>`,
                to: toEmail,
                subject: 'CryptoAlert Test Email',
                text: 'This is a test email from CryptoAlert. Your email configuration is working correctly!',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>CryptoAlert Test Email ✅</h2>
                    <p>Congratulations! Your email configuration is working correctly.</p>
                    <p>You will now receive email notifications when your price alerts are triggered.</p>
                </div>`
            });

            Logger.info(`Test email sent to ${toEmail}`, { messageId: info.messageId });
            return true;
        } catch (error) {
            Logger.error('Failed to send test email:', error);
            throw error;
        }
    }
}

module.exports = EmailService;