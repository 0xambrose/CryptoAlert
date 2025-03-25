const axios = require('axios');

class CoinGecko {
    constructor() {
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                'Accept': 'application/json'
            }
        });
    }

    // Get current price for a coin
    async getPrice(coinId) {
        try {
            const response = await this.client.get(`/simple/price`, {
                params: {
                    ids: coinId,
                    vs_currencies: 'usd',
                    include_24hr_change: true
                }
            });

            if (response.data[coinId]) {
                return {
                    price: response.data[coinId].usd,
                    change24h: response.data[coinId].usd_24h_change
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching price:', error.message);
            throw error;
        }
    }

    // Get list of supported coins
    async getCoins() {
        try {
            const response = await this.client.get('/coins/list');
            return response.data.map(coin => ({
                id: coin.id,
                symbol: coin.symbol.toUpperCase(),
                name: coin.name
            }));
        } catch (error) {
            console.error('Error fetching coins list:', error.message);
            throw error;
        }
    }

    // Get multiple coin prices
    async getPrices(coinIds) {
        try {
            const ids = Array.isArray(coinIds) ? coinIds.join(',') : coinIds;
            const response = await this.client.get('/simple/price', {
                params: {
                    ids: ids,
                    vs_currencies: 'usd',
                    include_24hr_change: true
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching multiple prices:', error.message);
            throw error;
        }
    }
}

module.exports = CoinGecko;