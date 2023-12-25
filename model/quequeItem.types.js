const mongoose = require('mongoose');




const quequeItemSchema = new mongoose.Schema({
    quequeId: {
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
const quequeItemModel = mongoose.model('quequeitems', quequeItemSchema);
module.exports = {quequeItemModel};