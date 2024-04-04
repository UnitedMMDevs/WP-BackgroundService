const mongoose = require('mongoose');
const queueItemSchema = new mongoose.Schema({
    queueId: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: false,
        default: ""
    },
    info1: {
        type: String,
        required: false,
        default: ""
    },
    info2: {
        type: String,
        required: false,
        default: ""
    },
    info3:{
        type: String,
        required: false,
        default: ""
    },
    spendCredit: {
        type: Number,
        required: false,
        default: false,
    },
    message_status: {
        type: [] || String,
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