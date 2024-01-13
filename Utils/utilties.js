const path = require('path');


const { MESSAGE_STRATEGY, FILE_TYPE } = require('./wp-utilities');
const { globalConfig } = require('./config');



getRandomDelay = (min, max) => {
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

const isMedia = (extension) => {
    const isMediaCondition = (extension === ".jpg" | extension === ".png" ||  extension === ".jpeg" || extension === ".mp4")
    return isMediaCondition ? FILE_TYPE.MEDIA : FILE_TYPE.FILE
}


const defineStrategy = (message, files) => {
    const justTextCondition = message && ((!files) || (files && files.length === 0))
    const justFileCondition = (!message || (message && message === "undefined")) && (files && files.length === 1)
    const multipleFileCondition = (!message || (message && message === "undefined")) && (files && files.length > 1)
    const multipleFileAndMessage = message && (files && files.length > 1)
    const oneFileAndMessage = message && (files && files.length === 1)
    if(justTextCondition) return MESSAGE_STRATEGY.JUST_TEXT
    if(justFileCondition) return MESSAGE_STRATEGY.JUST_FILE
    if(multipleFileCondition) return MESSAGE_STRATEGY.MULTIPLE_FILE
    if(multipleFileAndMessage) return MESSAGE_STRATEGY.MULTIPLE_FILE_MESSAGE
    if(oneFileAndMessage) return MESSAGE_STRATEGY.ONE_FILE_MESSAGE
}




module.exports =  { 
    getRandomDelay, 
    defineStatusCheckDelay, 
    defineStrategy, 
    getFileType, 
    isMedia,
}; 