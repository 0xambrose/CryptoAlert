# CryptoAlert

A cryptocurrency price monitoring and alert system built with Node.js, Express, and SQLite.

## Features

- **Real-time Price Monitoring**: Track current prices for Bitcoin, Ethereum, and Binance Coin
- **Custom Price Alerts**: Set alerts for when prices go above or below target thresholds
- **Web Interface**: Clean, responsive web UI for managing alerts and viewing prices
- **Automated Checking**: Background cron job checks alerts every 5 minutes
- **Database Storage**: SQLite database for persistent alert storage
- **REST API**: Complete API for programmatic access

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Start the server**:
```bash
npm start
```

3. **Open your browser** and navigate to `http://localhost:3000`

## API Endpoints

### Price Data
- `GET /api/price/:coinId` - Get current price for a specific coin
- `GET /api/coins` - Get list of supported coins

### Alert Management
- `POST /api/alerts` - Create a new price alert
- `GET /api/alerts` - Get all active alerts
- `DELETE /api/alerts/:id` - Delete an alert

### Example API Usage

```javascript
// Create an alert
fetch('/api/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        coinId: 'bitcoin',
        coinName: 'Bitcoin (BTC)',
        targetPrice: 50000,
        condition: 'above',
        email: 'user@example.com'
    })
});

// Get Bitcoin price
fetch('/api/price/bitcoin')
    .then(res => res.json())
    .then(data => console.log(data.price));
```

## Project Structure

```
├── server.js          # Main server file
├── database.js        # Database connection and schema
├── coingecko.js       # CoinGecko API integration
├── alerts.js          # Alert management logic
├── logger.js          # Logging utility
├── public/            # Frontend files
│   ├── index.html     # Main web interface
│   ├── style.css      # Styling
│   └── app.js         # Frontend JavaScript
└── package.json       # Dependencies and scripts
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **API**: CoinGecko API for price data
- **Scheduling**: node-cron for periodic checks

## Development

For development with auto-reload:
```bash
npm run dev
```

## License

MIT