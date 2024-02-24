const mongoose = require('mongoose');




const userSchema = new mongoose.Schema({
    avatar: {
        required: true,
        type: String
    },
    firstName: {
        required: true,
        type: String,
    },
    lastName: {
        required: true,
        type: String,
    },
    phone: {
        required: true,
        type: String,
    },
    email: {
        required: true,
        type: String,
    },
    email_hash: {
        required: false,
        type: String,
    },
    password: {
        required: true,
        type: String,
    },
    roleId: {
        required: true,
        type: mongoose.Types.ObjectId,
        ref: 'Role',
    },

    verified: {
        required: false,
        type: Boolean,
        default: false,
    },
    extraNumberCount: {
        required: true,
        type: Number,
    },
    created_at: {
        required: false,
        type: Date,
        default: new Date()
    },
    updated_at: {
        required: false,
        type: Date,
        default: new Date(),
    },
})
const userModel = mongoose.model('users', userSchema);
module.exports = {userModel};