const express = require('express');
const path = require('path');
const CoinGecko = require('./coingecko');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const coinGecko = new CoinGecko();
const database = new Database();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.send('CryptoAlert - Cryptocurrency Price Monitoring System');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});