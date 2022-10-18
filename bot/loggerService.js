const pino = require('pino');
module.exports = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
});

// https://css-tricks.com/how-to-implement-logging-in-a-node-js-application-with-pino-logger/