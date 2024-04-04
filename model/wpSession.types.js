const { MongoClient } = require("mongodb");
const { globalConfig } = require("../Utils/config");
const wpSessionCollection = (new MongoClient(globalConfig.mongo_url)).db("proWhatsApp").collection("whatsappsessions");
module.exports = { wpSessionCollection };