const mongoose = require('mongoose');

const extraNumberSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
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
const extraNumberModel = mongoose.model('extraphonenumbers', extraNumberSchema);
module.exports = {extraNumberModel};