const path = require('path');
const os = require('os');

getRootPath = () => {
    const filepath = `${path.parse(os.homedir()).root}home/.sandbox/`;
    return filepath;
}
getRandomDelay = (min, max) => {
    return Math.random() * (max - min) + min;
  }

module.exports =  { getRootPath, getRandomDelay};