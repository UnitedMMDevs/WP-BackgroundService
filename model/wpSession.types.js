const { MongoClient } = require("mongodb");
const { globalConfig } = require("../Utils/config");
const wpSessionCollection = (new MongoClient(globalConfig.env === "DEVELOPMENT" ? globalConfig.mongo_url_dev : globalConfig.mongo_url_prod )).db("proWhatsApp").collection("whatsappsessions");
module.exports = { wpSessionCollection };