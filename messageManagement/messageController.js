const fs = require("fs");
const { makeWASocket, DisconnectReason, delay, isJidBroadcast } = require("@whiskeysockets/baileys");

const wpClient = require("./wpController");
const { logger } = require("../Utils/logger");
const { globalConfig, socketOptions } = require("../model/config");
const { customerModel } = require("../model/customers.types");
const {parentPort} = require('worker_threads');
const {closeSocket, sendFile, sendMessage, sendFileAndMessage, checkAuthentication} = require('../Utils/wp-utilities');
const { getRandomDelay } = require("../Utils/utilties");
const { quequeModel, QUEUE_STATUS } = require("../model/queque.types");


class MessageController {
  constructor(dependencies) {
    // defining all dependencies
    this.dependencies = dependencies;
    this.controller = new wpClient.WpController(
      this.dependencies.userProps.session
    );
    this.isFile = false;
    this.isMessage = false;
    this.baseIdName = "@s.whatsapp.net";
    this.DefineStrategy();
    this.counter = 0;
  }

  DefineStrategy() {
    // making strategy for send types
    if (this.dependencies.files) {
      this.isFile = true;
    }
    if (
      this.dependencies.queue.quequeMessage &&
      this.dependencies.queue.quequeTitle
    ) {
      this.isMessage = true;
    }
  }



  async ExecuteProcess() {
    const { state, saveCreds } = await checkAuthentication(logger, this.controller, this.dependencies.userProps.session);
    if (!state) return;  
    const socket = makeWASocket(socketOptions);
    socket.ev.on('connection.update', async({ connection, lastDisconnect }) => {
      const status = lastDisconnect?.error?.output?.statusCode
      if (connection === 'close'){
          const reason = Object.entries(DisconnectReason).find(i => i[1] === status)?.[0] || 'unknown'  
          if (status !== 403 && status === 401 && !status){
            this.ExecuteProcess()
          }
      }
      else if (connection === 'open'){
        await saveCreds();
        const queueCheck = await quequeModel.findOne({_id: this.dependencies.queue._id.toString()});
        const condition = (queueCheck.status !== QUEUE_STATUS.PAUSED)
        const settings = this.dependencies.userProps.settings;
        if (this.counter < this.dependencies.queueItems.length && condition)
        {
          for (const item of this.dependencies.queueItems) {
            const customer = await customerModel.findById(item.customerId);
            const delaySeconds = getRandomDelay(
              settings.min_message_delay,
              settings.max_message_delay
            );
            if (customer) {
              await this.HandleSendMessageState(socket, customer, delaySeconds)
            }
          }
        }
        else 
          closeSocket(socket, parentPort);
      }
    })
    socket.ev.on("messages.update", async (update) => {
      console.log("update", update);
    })
  

    
  }
  
  async HandleSendMessageState(socket, customer, delaySeconds) {
    const wpId = `${customer.phone}${this.baseIdName}`;
    if (this.isFile && this.isMessage) {
      sendFileAndMessage(socket, wpId, this.dependencies.files, this.dependencies.queue);
    } else if (this.isFile && !this.isMessage) {
      await sendFile(socket, wpId, this.dependencies.files, this.dependencies.queue);
    } else if (!this.isFile && this.isMessage) {
      await sendMessage(socket, wpId);
    }
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.all,
      `Message sent to [${customer._id.toString()}] by [${settings.userId}]`
    );
    await delay(delaySeconds * 1000);
    this.counter++;
  }
}
module.exports = { MessageController };
