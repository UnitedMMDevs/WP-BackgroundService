/***********************************************************************
 *  İŞLEV: Mesaj gonderim aninda gonderim durumundaki engelleri kontrol eden modul
 *  AÇIKLAMA:
 *    - Sistem tarafindan uyulmasi gereken kurallari kontrol eden sinif.
 ***********************************************************************/

const { delay } = require("@whiskeysockets/baileys");
const { globalConfig } = require("../Utils/config");
const {logger} = require("../Utils/logger");
const { getRandomDelay } = require("../Utils/utilties");
const { checkReceiverExists, delayForProcessOverride } = require("../Utils/wp-utilities");
const { QUEUE_STATUS } = require("../model/queue.types");



class RuleChecker {
    /**********************************************
    * Fonksiyon: checkTimeIntervalForUser
    * Açıklama: Kuyrugun belirlenen zaman araliginda olup olmadigini kontrol eder.
    * Girdi(ler): settings
    * Çıktı: boolean
    **********************************************/
    static checkTimeIntervalForUser = (settings) => {
        //# =============================================================================
        //# Check time interval from user automation settings. 
        //# =============================================================================
        const currentDate = new Date()
        let currentHour = currentDate.getHours()
        let currentMinute = currentDate.getMinutes()    
        const condition = ((currentHour > settings.start_Hour && currentHour < settings.end_Hour) ||
        (currentHour === settings.start_Hour && currentMinute >= settings.start_Minute) ||
        (currentHour === settings.end_Hour && currentMinute <= settings.end_Minute));
        if (condition)
        {
            logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE TIME INTERVAL PASSED |||||||||||||||||||||||||||")
        }
        else {
            logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE TIME INTERVAL NOT PASSED |||||||||||||||||||||||||||")
        }
        return condition;
    }
    /**********************************************
    * Fonksiyon: checkQueuePausedByUser 
    * Açıklama: Kuyrugun kullanici tarafindan durdurulup durdurulmadigina bakar.
    * Girdi(ler): model (database object)
    * Çıktı: boolean
    **********************************************/
    static checkQueuePausedByUser = async(queue, model) => {
        //# =============================================================================
        //# If QUEUE paused by user. Than stop sending message to receivers. 
        //# =============================================================================
        const currentState = await model.findById(queue._id.toString());
        const condition = currentState.status === QUEUE_STATUS.PAUSED
        if (condition)
        {
            logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE PAUSED NOT PASSED |||||||||||||||||||||||||||")
        }
        else {
            logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE PAUSED PASSED |||||||||||||||||||||||||||")
        }
        return condition;
    }
    /**********************************************
    * Fonksiyon: checkUserBlacklistedOrGrayListed 
    * Açıklama: Mesaj gonderimi yapilacak kisinin sistemde kara listede olup olmadigina bakar.
    * Girdi(ler): model (database object)
    * Çıktı: boolean
    **********************************************/
    static checkUserBlacklistedOrGrayListed = async(item, model, userId) => {
        //# =============================================================================
        //# Check the current receiver blacklisted or graylisted!!! 
        //# =============================================================================
        const checkGrayOrBlackListed = await model.findOne({phone: item.phone, userId: userId,
        $or: [
            {registeredBlackList: true},
            {registeredGrayList: true}
        ]
        })
        
        if (checkGrayOrBlackListed)
        {
            logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE GRAYLIST BLACKLIST NOT PASSED |||||||||||||||||||||||||||")
            return checkGrayOrBlackListed;
        }
        logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE GRAYLIST BLACKLIST PASSED |||||||||||||||||||||||||||")
        return null;
    }
    /**********************************************
    * Fonksiyon: checkWpAccountExists 
    * Açıklama: Gonderim yapilacak kisinin wp hesabi olup olmadigini kontrol eder.
    * Girdi(ler): socket, receiver
    * Çıktı: boolean
    **********************************************/
    static checkWpAccountExists = async(socket, receiver) => {
        //# =============================================================================
        //# Check receiver not really exists 
        //# =============================================================================
        const delayTime = getRandomDelay(2, 4)
        await delayForProcessOverride(delayTime)
        const condition = await checkReceiverExists(socket, receiver);
        await delayForProcessOverride(delayTime)
        if (condition)
        {
            logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE WP ACCOUNT PASSED |||||||||||||||||||||||||||")
        }
        else {
            logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE WP ACCOUNT NOT PASSED |||||||||||||||||||||||||||")
        }
        return condition;
    }
    /**********************************************
    * Fonksiyon: ============================================================================= 
    * Açıklama: Gonderim yapilacak kisinin wp hesabi olup olmadigini kontrol eder.
    * Girdi(ler): socket, receiver
    * Çıktı: boolean
    **********************************************/
    static checkeSpamCodeSettings = (settings) => {
        //# =============================================================================
        //# Check user wants to use spam code or not 
        //# =============================================================================
        const condition = (settings.useSpamCode !== undefined) && settings.useSpamCode === true
        return condition;
    }

    static checkBlockedUser = async(socket, receiver) => {
        const blockedUsers = await socket.fetchBlocklist();
        const delayTime = getRandomDelay(2, 4)
        await delayForProcessOverride(delayTime)
        const userKey = receiver
        const condition = blockedUsers.includes(userKey)
        if (condition)
        {
            logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE WP BLOCKED USERS NOT PASSED |||||||||||||||||||||||||||")
        }
        else {
            logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, "||||||||||||||||||||||||||| RULE QUEUE WP BLOCKED USERS PASSED |||||||||||||||||||||||||||")
        }
        return condition;
    }
}

module.exports = {RuleChecker};