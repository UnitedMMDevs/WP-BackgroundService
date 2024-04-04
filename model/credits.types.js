const mongoose = require('mongoose');





const creditSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true
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
const creditsModel = mongoose.model('credits', creditSchema);
module.exports = {creditsModel};