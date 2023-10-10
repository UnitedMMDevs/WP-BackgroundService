const mongoose = require('mongoose');

const automationSettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
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
    beginTime: {
        type: Date,
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