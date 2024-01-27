const path = require('path');
const { globalConfig } = require('./config');
const { FILE_TYPE } = require('./wp-utilities');
const fs = require("fs")
const getRandomDelay = (min, max) => {
    return Math.random() * (max - min) + min;
}

const defineStatusCheckDelay = (totalItemCount) =>
{
    if (totalItemCount < 10)
    {
        return 1;
    }
    else if (totalItemCount < 50)
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
const deleteFolderRecursive = (directoryPath) => {
    if (fs.existsSync(directoryPath)) {
      fs.readdirSync(directoryPath).forEach((file) => {
        const curPath = path.join(directoryPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(directoryPath);
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
    deleteFolderRecursive,
}; 