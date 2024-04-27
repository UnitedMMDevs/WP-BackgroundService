import mongoose, { Schema } from "mongoose";


const dummyObj = {
    info: "test info",
    message: "CONTNET TEXT",
    sent_type: "ALL"
}

export const notificationConfigSchema = new Schema({
    registerObj: {
        type: String,
        required: false,
        default: JSON.stringify(dummyObj),
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
    serviceStatus: {
        type: String,
        enum: ['ACTIVE','INACTIVE'],
        requried: true
    }
})
export const notificationConfigModel = mongoose.model('NotificationConfigurations', notificationConfigSchema);
