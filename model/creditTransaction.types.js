const mongoose = require('mongoose');
const creditTransaction = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    transaction_type: {
        type: String,
        enum: ['spent', 'upload'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transaction_date: {
        type: Date,
        required: false,
        default: new Date()
    }
});
const creditTransactionModel = mongoose.model('CreditTransactions', creditTransaction);
module.exports = {creditTransactionModel};