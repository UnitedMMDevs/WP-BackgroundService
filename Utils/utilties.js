const path = require('path');
const { globalConfig } = require('./config');
const { FILE_TYPE } = require('./wp-utilities');

const getRandomDelay = (min, max) => {
    return Math.random() * (max - min) + min;
}

const defineStatusCheckDelay = (totalItemCount) =>
{
    if (totalItemCount < 10)
    {
        return 1;
    }
    else if (totalItemCount < 2)
    {
        return 2;
    }
    else if(totalItemCount < 100)
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

const getFileType = (file_name) => {
    const extension = path.extname(file_name).toLowerCase();
    return extension;
}
module.exports =  { 
    getRandomDelay, 
    defineStatusCheckDelay,  
    getFileType, 
}; 