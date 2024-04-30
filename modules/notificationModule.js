const { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NOTIFICATION_STATUS } = require("../Utils/constants");
const { notificationRecordsModel } = require("../model/notificationRecords");
const { userNotificationSettingsModel } = require("../model/userNotificationSettings.types");


class NotificationModule {

    static defineStrategy(userSetting, notificationChannel) {
        if(userSetting === NOTIFICATION_CHANNELS.WP)
        {
            if (notificationChannel === NOTIFICATION_CHANNELS.WP || notificationChannel === NOTIFICATION_CHANNELS.ALL){
                return NOTIFICATION_CHANNELS.WP
            }
            else if(notificationChannel === NOTIFICATION_CHANNELS.MAIL || notificationChannel === NOTIFICATION_CHANNELS.NONE) {
                return NOTIFICATION_CHANNELS.NONE;
            }
        }   
        else if(userSetting === NOTIFICATION_CHANNELS.MAIL) {
            if (notificationChannel === NOTIFICATION_CHANNELS.MAIL || notificationChannel === NOTIFICATION_CHANNELS.ALL){
                return NOTIFICATION_CHANNELS.MAIL
            }
            else if(notificationChannel === NOTIFICATION_CHANNELS.WP || notificationChannel === NOTIFICATION_CHANNELS.NONE) {
                return NOTIFICATION_CHANNELS.NONE;
            }
        }
        else if (userSetting === NOTIFICATION_CHANNELS.ALL){ 
            if (notificationChannel !== NOTIFICATION_CHANNELS.NONE)
                return notificationChannel
            else
                return NOTIFICATION_CHANNELS.NONE
        }
        else {
            return NOTIFICATION_CHANNELS.NONE
        }
    }
    static notify = async(notificationType, notificationChannel, value, userNotificationSettings) => {
        let newNotification ={};
        switch(notificationType) {

            case NOTIFICATION_TYPES.REGISTER: {
                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: notificationChannel,
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            case NOTIFICATION_TYPES.UPLOAD_CREDIT: {
                let userUploadSetting = JSON.parse(userNotificationSettings.uploadCreditObj);
                let channel = "";
                if (!userUploadSetting.mail && userUploadSetting.wp)
                    channel = NOTIFICATION_CHANNELS.WP
                else if (userUploadSetting.mail && !userUploadSetting.wp)
                    channel = NOTIFICATION_CHANNELS.MAIL
                else if (userUploadSetting.mail && userUploadSetting.wp)
                    channel = NOTIFICATION_CHANNELS.ALL
                else if (!userUploadSetting.mail && !userUploadSetting.wp)
                    channel = NOTIFICATION_CHANNELS.NONE
                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: NotificationModule.defineStrategy(channel, notificationChannel),
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            case NOTIFICATION_TYPES.NEW_QUEUE: {
                let newQueueSettingObj = JSON.parse(userNotificationSettings.newQueueObj)
                let channel = "";
                if (!newQueueSettingObj.mail && newQueueSettingObj.wp)
                    channel = NOTIFICATION_CHANNELS.WP
                else if (newQueueSettingObj.mail && !newQueueSettingObj.wp)
                    channel = NOTIFICATION_CHANNELS.MAIL
                else if (newQueueSettingObj.mail && newQueueSettingObj.wp)
                    channel = NOTIFICATION_CHANNELS.ALL
                else if (!newQueueSettingObj.mail && !newQueueSettingObj.wp)
                    channel = NOTIFICATION_CHANNELS.NONE

                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: NotificationModule.defineStrategy(channel, notificationChannel),
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            case NOTIFICATION_TYPES.QUEUE_ERROR: {
                let queueErrorSettingOb = JSON.parse(userNotificationSettings.queueErrorObj)
                let channel = "";
                if (!queueErrorSettingOb.mail && queueErrorSettingOb.wp)
                    channel = NOTIFICATION_CHANNELS.WP
                else if (queueErrorSettingOb.mail && !queueErrorSettingOb.wp)
                    channel = NOTIFICATION_CHANNELS.MAIL
                else if (queueErrorSettingOb.mail && queueErrorSettingOb.wp)
                    channel = NOTIFICATION_CHANNELS.ALL
                else if (!queueErrorSettingOb.mail && !queueErrorSettingOb.wp)
                    channel = NOTIFICATION_CHANNELS.NONE

                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: NotificationModule.defineStrategy(channel, notificationChannel),
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            case NOTIFICATION_TYPES.QUEUE_HAS_BEEN_FINISHED: {
                let queueFinished = JSON.parse(userNotificationSettings.queueFinishedObj)
                let channel = "";
                if (!queueFinished.mail && queueFinished.wp)
                    channel = NOTIFICATION_CHANNELS.WP
                else if (queueFinished.mail && !queueFinished.wp)
                    channel = NOTIFICATION_CHANNELS.MAIL
                else if (queueFinished.mail && queueFinished.wp)
                    channel = NOTIFICATION_CHANNELS.ALL
                else if (!queueFinished.mail && !queueFinished.wp)
                    channel = NOTIFICATION_CHANNELS.NONE

                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: NotificationModule.defineStrategy(channel, notificationChannel),
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            case NOTIFICATION_TYPES.QUEUE_HAS_BEEN_PAUSED: {
                let queuePausedSettingsObj = JSON.parse(userNotificationSettings.queuePausedObj)
                let channel = "";
                if (!queuePausedSettingsObj.mail && queuePausedSettingsObj.wp)
                    channel = NOTIFICATION_CHANNELS.WP
                else if (queuePausedSettingsObj.mail && !queuePausedSettingsObj.wp)
                    channel = NOTIFICATION_CHANNELS.MAIL
                else if (queuePausedSettingsObj.mail && queuePausedSettingsObj.wp)
                    channel = NOTIFICATION_CHANNELS.ALL
                else if (!queuePausedSettingsObj.mail && !queuePausedSettingsObj.wp)
                    channel = NOTIFICATION_CHANNELS.NONE

                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: NotificationModule.defineStrategy(channel, notificationChannel),
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            case NOTIFICATION_TYPES.QUEUE_HAS_BEEN_STARTED_AGAIN: {
                let queueStartedAgainObj = JSON.parse(userNotificationSettings.queueBeginObj)
                let channel = "";
                if (!queueStartedAgainObj.mail && queueStartedAgainObj.wp)
                    channel = NOTIFICATION_CHANNELS.WP
                else if (queueStartedAgainObj.mail && !queueStartedAgainObj.wp)
                    channel = NOTIFICATION_CHANNELS.MAIL
                else if (queueStartedAgainObj.mail && queueStartedAgainObj.wp)
                    channel = NOTIFICATION_CHANNELS.ALL
                else if (!queueStartedAgainObj.mail && !queueStartedAgainObj.wp)
                    channel = NOTIFICATION_CHANNELS.NONE

                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: NotificationModule.defineStrategy(channel, notificationChannel),
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            case NOTIFICATION_TYPES.QUEUE_HAS_BEEN_STARTED: {
                let queueBeginObj = JSON.parse(userNotificationSettings.queueStartedAgainObj)
                let channel = "";
                if (!queueBeginObj.mail && queueBeginObj.wp)
                    channel = NOTIFICATION_CHANNELS.WP
                else if (queueBeginObj.mail && !queueBeginObj.wp)
                    channel = NOTIFICATION_CHANNELS.MAIL
                else if (queueBeginObj.mail && queueBeginObj.wp)
                    channel = NOTIFICATION_CHANNELS.ALL
                else if (!queueBeginObj.mail && !queueBeginObj.wp)
                    channel = NOTIFICATION_CHANNELS.NONE

                newNotification = {
                    notification_state: NOTIFICATION_STATUS.PENDING,
                    notification_strategy: NotificationModule.defineStrategy(channel, notificationChannel),
                    notification_type: notificationType,
                    notification_value: value,
                    retry_count: 0,
                    createdAt: new Date()
                }
                break;
            }
            
        }
        if (newNotification.notification_strategy !== NOTIFICATION_CHANNELS.NONE)
                await notificationRecordsModel.create(newNotification);
    }
}

module.exports = {NotificationModule}