class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    static info(message, data = null) {
        this.log('info', message, data);
    }

    static error(message, error = null) {
        this.log('error', message, error);
    }

    static warn(message, data = null) {
        this.log('warn', message, data);
    }

    static debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, data);
        }
    }
}

module.exports = Logger;