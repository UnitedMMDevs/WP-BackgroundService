const { notificationRecordsModel } = require("../model/notificationRecords");


class NotificationModule {

    static notify = async(notificationType, notificationChannel, value) => {
        let newNotification = {
            notification_state: 'PENDING',
            notification_strategy: notificationChannel,
            notification_type: notificationType,
            notification_value: value,
            retry_count: 0,
            createdAt: new Date()
        }
        await notificationRecordsModel.create(newNotification);
    }
}

module.exports = {NotificationModule}