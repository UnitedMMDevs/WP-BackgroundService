const fs = require("fs");
const { makeWASocket, delay } = require("@whiskeysockets/baileys");

const wpClient = require("./wpController");
const { logger } = require("../Utils/logger");
const { customerModel } = require("../model/customers.types");
const {parentPort} = require('worker_threads');
const {closeSocket, sendMedia, sendMessage, sendFileAndMessage, checkAuthentication, generateSocketOptions, MESSAGE_STATUS, MESSAGE_STRATEGY, FILE_TYPE, sendMediaAndContentMessage, sendFile} = require('../Utils/wp-utilities');
const { getRandomDelay, defineStatusCheckDelay, defineStrategy, getFileType, isMedia} = require("../Utils/utilties");
const { quequeModel, QUEUE_STATUS } = require("../model/queque.types");
const { default: mongoose } = require("mongoose");
const events = require("worker/build/main/browser/events");
const { globalConfig } = require("../Utils/config");


class MessageController {
  constructor({
    queue,
    userProps,
    files,
    queueItems
  }) {
    // defining all dependencies
    this.queue = queue;
    this.userProps = userProps;
    this.files = files;
    this.queueItems = queueItems;
    this.checkStatusPerItem = defineStatusCheckDelay(this.queueItems.length);
    this.baseIdName = "@s.whatsapp.net";
    this.isConnected = false;
    this.otomationUpdates = []
    
    this.strategy = defineStrategy(this.queue.quequeMessage, this.files)

    this.controller = new wpClient.WpController(
      this.userProps.session
    );
    
    
  }
  async CheckConnectionSuccess(){
    return this.isConnected
  }

  async InitializeSocket() {
    this.authConfig = await checkAuthentication(logger, this.controller, this.userProps.session);
    if (!this.authConfig.state && !this.authConfig.saveCreds) return;
    const socketOptions = generateSocketOptions(this.authConfig.state)
    this.socket = makeWASocket(socketOptions);
    this.socket.ev.on('connection.update',  async ({ connection, lastDisconnect }) =>{
      const status = lastDisconnect?.error?.output?.statusCode
      if (connection === 'close'){
          if (status !== 403 && status === 401 && !status){
            this.InitializeSocket()
          }
      }
      else if (connection === 'open'){
        await this.authConfig.saveCreds()
        this.isConnected = true;
      }
    })
    this.socket.ev.on('creds.update', this.authConfig.saveCreds)
    // this.socket.ev.on('messages.upsert', async (update) => {
    //   console.log("upsert", JSON.stringify(update, undefined, 2))
    // })
    this.socket.ev.on('messages.update', async (update) => {
      console.log("update", JSON.stringify(update, undefined, 2))
    })
    setTimeout(async() => {

    }, 5000);
    if(this.CheckConnectionSuccess())
      await this.ExecuteOtomation()
  }
  
  async ExecuteOtomation(){
    const settings = this.userProps.settings;
    for (const item of this.queueItems) {
      const delaySeconds = getRandomDelay(
        settings.min_message_delay,
        settings.max_message_delay
      );
      await delay(delaySeconds * 1000);
      if (this.counter % this.checkStatusPerItem === 0)
      {
        const currentState = await quequeModel.findById(this.queue._id.toString());
        if (currentState.status === QUEUE_STATUS.PAUSED)
        {
          closeSocket(socket, parentPort);
          break;
        }
      }
      const customer = await customerModel.findById(item.customerId);
      if (customer) {
        const currentReceiver = `${customer.phone}${this.baseIdName}`;
        await this.SendDataToReceiver(currentReceiver)
        
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.all,
          `Message sent to [${customer._id.toString()}] by [${settings.userId}]`
        );
        this.counter++;
      }
    }
    this.queue.status = QUEUE_STATUS.COMPLETED;
    await quequeModel.updateOne(
      {_id: this.queue._id.toString()},
        {$set:this.queue}
    );
  }
  async SendDataToReceiver(currentReceiver){
    switch(this.strategy)
    {
      case MESSAGE_STRATEGY.JUST_TEXT:
      {
        await sendMessage(this.socket, currentReceiver, this.queue.quequeMessage)
        break;
      }
      case MESSAGE_STRATEGY.JUST_FILE: // OK
      {
       const extension = getFileType(this.files[0])
       const file_type = isMedia(extension)
       const fullFilePath = `${globalConfig.baseRootPath
       }${this.queue._id.toString()}/${this.files[0]}`;
       if(file_type === FILE_TYPE.MEDIA)
        await sendMedia(this.socket, currentReceiver, fullFilePath, extension)
       else {
        await sendFile(this.socket, currentReceiver, fullFilePath, extension)
       }
       break;
      }
      case MESSAGE_STRATEGY.MULTIPLE_FILE: // OK
      {
        console.log("here")
        this.files.map(async(file) => {
          const extension = getFileType(file)
          const file_type = isMedia(extension)
          const fullFilePath = `${globalConfig.baseRootPath
          }${this.queue._id.toString()}/${file}`;
          if(file_type === FILE_TYPE.MEDIA)
           await sendMedia(this.socket, currentReceiver, fullFilePath, extension)
          else{
            await sendFile(this.socket, currentReceiver, fullFilePath, extension)
          }
        })
        break;
      }
      case MESSAGE_STRATEGY.MULTIPLE_FILE_MESSAGE: // OK
      {
        await sendMessage(this.socket, currentReceiver, this.queue.quequeMessage)
        this.files.map(async(file) => {
          const extension = getFileType(file)
          const file_type = isMedia(extension)
          const fullFilePath = `${globalConfig.baseRootPath
          }${this.queue._id.toString()}/${file}`;
          if(file_type === FILE_TYPE.MEDIA)
           await sendMedia(this.socket, currentReceiver, fullFilePath, extension)
          else {
           
            await sendFile(this.socket, currentReceiver, fullFilePath, extension)
          }  
        })
        break;
      }
      case MESSAGE_STRATEGY.ONE_FILE_MESSAGE: // OK
      {
        const extension = getFileType(this.files[0])
        const file_type = isMedia(extension)
        const fullFilePath = `${globalConfig.baseRootPath
        }${this.queue._id.toString()}/${this.files[0]}`;
        if(file_type === FILE_TYPE.FILE)
        {
          await sendMessage(this.socket, currentReceiver, this.queue.quequeMessage)
          await sendFile(this.socket, currentReceiver, fullFilePath, extension)
        }
        else
        {
          await sendMediaAndContentMessage(this.socket, currentReceiver, fullFilePath, extension, this.queue.quequeMessage)
        }
        break;
      }
    }
  }
}
module.exports = { MessageController };
