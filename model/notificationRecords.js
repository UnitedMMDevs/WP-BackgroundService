const { default: mongoose } = require("mongoose");
const { Schema } = require("mongoose");
const { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, NOTIFICATION_STATUS } = require("../Utils/constants");



const noticationRecordsScehma = new Schema({
    notification_type: {
        type: String,
        enum: Object.values(NOTIFICATION_TYPES),
        required: true
    },
    notification_value: {
        type: String,
        required: true,
    },
    notification_strategy: {
        type: String,
        enum: Object.values(NOTIFICATION_CHANNELS),
        required: true,
    },
    notification_state: {
        type: String,
        enum: Object.values(NOTIFICATION_STATUS),
        required: true,
    },
    retry_count: {
        type: Number,
        required: false,
        default: 0
    },
    createdAt: {
        type: Date,
        required: false,
        default: new Date()
    },
    updatedAt: {
        type: Date,
        required: false,
        default: new Date()
    }
})

const notificationRecordsModel = mongoose.model('NotificationRecords', noticationRecordsScehma);
module.exports = {notificationRecordsModel}