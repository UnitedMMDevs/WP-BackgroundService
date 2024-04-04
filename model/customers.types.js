const mongoose = require('mongoose');





const customerSchema = new mongoose.Schema({
    userId: {
        required: true,
        type: String,
    },
    groupId: {
        required: false,
        type: String,
    },
    name: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    registeredBlackList: {
        required: false,
        type: Boolean,
        default: false,
    },
    registeredGrayList:{
        required: false,
        type: Boolean,
        default: false,
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
const customerModel = mongoose.model('customers', customerSchema);
module.exports = {customerModel};