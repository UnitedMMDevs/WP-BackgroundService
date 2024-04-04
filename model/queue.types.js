const mongoose = require('mongoose');

const QUEUE_STATUS_ERROR_CODES = {
    NO_SESSION: "WhatsApp uygulamasında aktif bir oturumunuz yok.",
    SERVER_ERROR: "Bir sunucu sorunu nedeniyle hata oluştu.",
    FILE_ERROR: "Kuyruğa eklenmiş dosyalarda sorun bulunuyor.",
    CONFLICT: "Kullanıcı bu hesabı aynı anda kullanmaya çalışıyor."
}
const QUEUE_STATUS = {
    PENDING:'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    PAUSED: 'PAUSED',
    ERROR: "ERROR"
}
  
const queueSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    sessionId: {
        type:String,
        required: true,
    },
    queueTitle: {
        type: String,
        required: true,
    },
    queueMessage: {
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
const queueModel = mongoose.model('queue', queueSchema);
module.exports = {queueModel, QUEUE_STATUS, QUEUE_STATUS_ERROR_CODES}