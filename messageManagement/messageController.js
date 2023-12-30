const fs = require("fs");
const { makeWASocket, DisconnectReason, delay, isJidBroadcast } = require("@whiskeysockets/baileys");

const wpClient = require("./wpController");
const { logger } = require("../Utils/logger");
const { globalConfig } = require("../model/config");
const { customerModel } = require("../model/customers.types");
const {parentPort} = require('worker_threads');
const {closeSocket, sendFile, sendMessage, sendFileAndMessage, checkAuthentication} = require('../Utils/wp-utilities');
const { getRandomDelay, defineStatusCheckDelay} = require("../Utils/utilties");
const { quequeModel, QUEUE_STATUS } = require("../model/queque.types");


class MessageController {
  constructor(dependencies) {
    // defining all dependencies
    this.dependencies = dependencies;
    this.controller = new wpClient.WpController(
      this.dependencies.userProps.session
    );
    this.checkStatusPerItem = defineStatusCheckDelay(this.dependencies.queueItems.length);
    this.isFile = false;
    this.isMessage = false;
    this.baseIdName = "@s.whatsapp.net";
    this.DefineStrategy();
    this.counter = 0;
    this.message_updates = [];
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
    const socketOptions = {
      printQRInTerminal: false,
      auth: state,
      receivedPendingNotifications: false,
      defaultQueryTimeoutMs: undefined,
      markOnlineOnConnect: false,
      shouldIgnoreJid: jid => isJidBroadcast(jid),
      syncFullHistory: false
    };
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
        const settings = this.dependencies.userProps.settings;
        if (this.counter < this.dependencies.queueItems.length)
        {
          for (const item of this.dependencies.queueItems) {
            if (this.counter % this.checkStatusPerItem === 0)
            {
              const currentState = await quequeModel.findById(this.dependencies.queue._id.toString());
              if (currentState.status === QUEUE_STATUS.PAUSED)
              {
                closeSocket(socket, parentPort);
                break;
              }
            }
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
        {
          this.dependencies.queue.status = QUEUE_STATUS.COMPLETED;
          await quequeModel.updateOne(this.dependencies.queue._id.toString(),this.dependencies.queue)
          closeSocket(socket, parentPort);
        }
      }
    })
    socket.ev.on("messages.upsert", async (update) => {
      console.log("update", update);
    })
  }
  
  async HandleSendMessageState(socket, customer, delaySeconds) {
    const settings = this.dependencies.userProps.settings;
    const wpId = `${customer.phone}${this.baseIdName}`;
    if (this.isFile && this.isMessage) {
      sendFileAndMessage(socket, wpId, this.dependencies.files, this.dependencies.queue);
    } else if (this.isFile && !this.isMessage) {
      await sendFile(socket, wpId, this.dependencies.files, this.dependencies.queue);
    } else if (!this.isFile && this.isMessage) {
      await sendMessage(socket, wpId, this.dependencies.queue);
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
