const path = require('path');
const os = require('os');
const {getRootPath} = require('../Utils/utilties');
const globalConfig = {
    mongo_url: "mongodb://127.0.0.1:27017/proWhatsApp",
    baseRootPath: getRootPath(),
    LogTypes: {
        info: 'info',
        error: 'error',
        warn: 'warn'
    },
    LogLocations: {
        all: 'ALL',
        consoleAndDb: 'CONSOLE&DB',
        consoleAndFile: 'CONSOLE&FILE',
        console: 'CONSOLE',
        db: 'DB',
        file: 'FILE',

    }
}

module.exports = {globalConfig};