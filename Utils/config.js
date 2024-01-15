const path = require('path');
const os = require('os');

getRootPath = () => {
    const filepath = `${path.parse(os.homedir()).root}home/.sandbox/`;
    return filepath;
}

const globalConfig = {
    mongo_url: "mongodb://localhost:27017/proWhatsApp",
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
module.exports = { globalConfig };
