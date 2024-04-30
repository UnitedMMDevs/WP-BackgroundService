const  mongoose = require("mongoose");

const dummyObj = {
    mail: true,
    wp: true,
    notification_name: "test"
}

const userNotificationSettingsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    uploadCreditObj: {
        type: String,
        required: false,
        default: JSON.stringify(dummyObj),
    },
    newQueueObj: {
        type: String,
        required: false,
        default: JSON.stringify(dummyObj),
    },
    queueBeginObj: {
        type: String,
        required: false,
        default: JSON.stringify(dummyObj) 
    },
    queueErrorObj: {
        type: String,
        required: false,
        default: JSON.stringify(dummyObj)
    },
    queuePausedObj:{
        type: String,
        required: false,
        default: JSON.stringify(dummyObj) 
    },
    queueFinishedObj: {
        type: String,
        required: false,
        default: JSON.stringify(dummyObj),
    },
    queueStartedAgainObj: {
        type: String,
        required: false,
        default: JSON.stringify(dummyObj)
    },
})
const userNotificationSettingsModel = mongoose.model('UserNotificationSettings', userNotificationSettingsSchema);

module.exports = {userNotificationSettingsModel}