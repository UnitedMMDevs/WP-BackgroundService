const mongoose = require('mongoose');
const queueItemSchema = new mongoose.Schema({
    queueId: {
        type: String,
        required: true,
    },
    customerId: {
        type: String,
        required: true,
    },
    spendCredit: {
        type: Number,
        required: false,
        default: 0,
    },
    message_status: {
        type: String,
        required: false,
        default: ""
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
});
const queueItemModel = mongoose.model('queueitems', queueItemSchema);
module.exports = {queueItemModel};