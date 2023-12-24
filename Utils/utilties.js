const path = require('path');
const os = require('os');

getRootPath = () => {
    const filepath = `${path.parse(os.homedir()).root}home/.sandbox/`;
    return filepath;
}


module.exports =  { getRootPath };