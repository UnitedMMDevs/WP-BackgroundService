const mongoose = require('mongoose');

const quequeSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    sessionId: {
        type:String,
        required: true,
    },
    quequeTitle: {
        type: String,
        required: true,
    },
    quequeMessage: {
        type: String,
        required: true
    },
    status : {
        type: String,
        required: true
    },
    startDate: {
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

});
const quequeModel = mongoose.model('queques', quequeSchema);
module.exports = {quequeModel}