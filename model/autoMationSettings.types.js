const mongoose = require('mongoose');

const automationSettingsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    min_message_delay: {
        type: Number,
        required: true,
        default: 0
    },
    max_message_delay: {
        type: Number,
        required: true,
        default: 5,
    },
    start_Hour: {
        type: Number,
        required: true,
    },
    start_Minute: {
        type: Number,
        required: true,
    },
    end_Hour: {
        type: Number,
        required: true,
    },
    end_Minute: {
        type: Number,
        required: true,
    },
    useSpamCode: {
        type: Boolean,
        required: false,
        default: false
    },
    defaultAreaCode: {
        type: Number,
        required: false,
        default: 90
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
const automationSettingsModel = mongoose.model('automationsettings', automationSettingsSchema);
module.exports = {automationSettingsModel};
