const mongoDb = require('mongodb');
const {globalConfig} = require("./config");
const mongoClient = new mongoDb.MongoClient(globalConfig.mongo_url);
const wpSessionCollection = mongoClient
    .db("proWhatsApp")
    .collection("whatsappsessions");
// burada qr kod gönderilecek. (bu fonksiyon sadece connection anında bir kere tetikleniyor ve client'a qr kodu gönderme işlemini yapıyor);
// wpclient;
module.exports = {mongoClient, wpSessionCollection};