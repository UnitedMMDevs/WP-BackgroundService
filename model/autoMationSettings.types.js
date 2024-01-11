const mongoose = require('mongoose');

export const automationSettingsSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: 'User',
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