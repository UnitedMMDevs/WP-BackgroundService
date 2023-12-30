const path = require('path');
const os = require('os');

getRootPath = () => {
    const filepath = `${path.parse(os.homedir()).root}home/.sandbox/`;
    return filepath;
}
getRandomDelay = (min, max) => {
    return Math.random() * (max - min) + min;
}
const defineStatusCheckDelay = (totalItemCount) =>
{
    if(totalItemCount < 100)
    {
        return 5;
    }
    else if(totalItemCount > 100 && totalItemCount < 600)
    {
        return 10;
    }
    else if (totalItemCount >= 600)
    {
        return 20;
    }
}

module.exports =  { getRootPath, getRandomDelay, defineStatusCheckDelay};