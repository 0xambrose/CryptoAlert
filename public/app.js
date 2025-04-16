class CryptoAlertApp {
    constructor() {
        this.init();
        this.loadPrices();
        this.loadAlerts();
        this.setupEventListeners();

        // Refresh prices every minute
        setInterval(() => this.loadPrices(), 60000);
    }

    init() {
        this.popularCoins = ['bitcoin', 'ethereum', 'binancecoin'];
        this.supportedCoins = [];
        this.loadSupportedCoins();
    }

    setupEventListeners() {
        const alertForm = document.getElementById('alert-form');
        alertForm.addEventListener('submit', (e) => this.createAlert(e));
    }

    async loadPrices() {
        try {
            const promises = this.popularCoins.map(coin =>
                fetch(`/api/price/${coin}`).then(res => res.json())
            );

            const results = await Promise.all(promises);

            results.forEach((data, index) => {
                if (data.price) {
                    const coin = this.popularCoins[index];
                    const priceElement = document.getElementById(`${coin.substring(0,3).toLowerCase()}-price`);
                    const changeElement = document.getElementById(`${coin.substring(0,3).toLowerCase()}-change`);

                    if (priceElement) {
                        priceElement.textContent = `$${data.price.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}`;
                    }

                    if (changeElement && data.change24h) {
                        const change = data.change24h;
                        changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                        changeElement.className = `change ${change >= 0 ? 'positive' : 'negative'}`;
                    }
                }
            });
        } catch (error) {
            console.error('Error loading prices:', error);
        }
    }

    async loadAlerts() {
        try {
            const response = await fetch('/api/alerts');
            const alerts = await response.json();

            this.displayAlerts(alerts);
        } catch (error) {
            console.error('Error loading alerts:', error);
            document.getElementById('alerts-list').innerHTML = 'Error loading alerts';
        }
    }

    async loadSupportedCoins() {
        try {
            const response = await fetch('/api/coins');
            const coins = await response.json();

            this.supportedCoins = coins;
            this.populateCoinSelect(coins);
        } catch (error) {
            console.error('Error loading supported coins:', error);
            // Fallback to default coins
            const fallbackCoins = [
                { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
                { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
                { id: 'binancecoin', name: 'Binance Coin', symbol: 'BNB' }
            ];
            this.populateCoinSelect(fallbackCoins);
        }
    }

    populateCoinSelect(coins) {
        const coinSelect = document.getElementById('coin-select');
        coinSelect.innerHTML = '<option value="">Select a coin...</option>';

        // Add popular coins first
        const popularIds = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'dogecoin', 'polkadot', 'litecoin'];
        const popularCoins = coins.filter(coin => popularIds.includes(coin.id));
        const otherCoins = coins.filter(coin => !popularIds.includes(coin.id));

        if (popularCoins.length > 0) {
            const popularGroup = document.createElement('optgroup');
            popularGroup.label = 'Popular Cryptocurrencies';
            popularCoins.forEach(coin => {
                const option = document.createElement('option');
                option.value = coin.id;
                option.textContent = `${coin.name} (${coin.symbol})`;
                popularGroup.appendChild(option);
            });
            coinSelect.appendChild(popularGroup);
        }

        if (otherCoins.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = 'Other Cryptocurrencies';
            otherCoins.slice(0, 50).forEach(coin => { // Limit to 50 to avoid overwhelming UI
                const option = document.createElement('option');
                option.value = coin.id;
                option.textContent = `${coin.name} (${coin.symbol})`;
                otherGroup.appendChild(option);
            });
            coinSelect.appendChild(otherGroup);
        }
    }

    displayAlerts(alerts) {
        const alertsList = document.getElementById('alerts-list');

        if (alerts.length === 0) {
            alertsList.innerHTML = '<p>No active alerts</p>';
            return;
        }

        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-info">
                    <strong>${alert.coin_name}</strong> -
                    Alert when price goes ${alert.condition} $${alert.target_price}
                    <br>
                    <small>Email: ${alert.email} | Created: ${new Date(alert.created_at).toLocaleDateString()}</small>
                </div>
                <div class="alert-actions">
                    <button onclick="app.deleteAlert(${alert.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async createAlert(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const coinId = document.getElementById('coin-select').value;
        const coinName = document.getElementById('coin-select').selectedOptions[0].text;
        const targetPrice = parseFloat(document.getElementById('target-price').value);
        const condition = document.getElementById('condition').value;
        const email = document.getElementById('email').value;

        try {
            const response = await fetch('/api/alerts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    coinId,
                    coinName,
                    targetPrice,
                    condition,
                    email
                })
            });

            if (response.ok) {
                alert('Alert created successfully!');
                e.target.reset();
                this.loadAlerts(); // Refresh alerts list
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating alert:', error);
            alert('Error creating alert');
        }
    }

    async deleteAlert(alertId) {
        if (!confirm('Are you sure you want to delete this alert?')) {
            return;
        }

        try {
            const response = await fetch(`/api/alerts/${alertId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Alert deleted successfully');
                this.loadAlerts(); // Refresh alerts list
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error deleting alert:', error);
            alert('Error deleting alert');
        }
    }
}

// Initialize the app when page loads
const app = new CryptoAlertApp();