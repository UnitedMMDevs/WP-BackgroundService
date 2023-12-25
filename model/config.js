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
const socketOptions = {
    printQRInTerminal: false,
    auth: state,
    receivedPendingNotifications: false,
    defaultQueryTimeoutMs: undefined,
    markOnlineOnConnect: false,
    shouldIgnoreJid: jid => isJidBroadcast(jid),
    syncFullHistory: false
  };
module.exports = {globalConfig, socketOptions};