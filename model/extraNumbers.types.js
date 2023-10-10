const mongoose = require('mongoose');

const extraNumberSchema = new mongoose.Schema({
    userId: {
        type: Types.ObjectId,
        required: true,
        ref: 'User'
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