const mongoose = require('mongoose');




const customerGroupSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    groupName: {
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
const customerGroupModel = mongoose.model('customergroups', customerGroupSchema);
module.exports = {customerGroupModel}