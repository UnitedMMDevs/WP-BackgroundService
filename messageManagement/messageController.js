const wpClient = require("./wpController");
const { wpSessionCollection, BufferJSON } = require("../model/wpSession.types");
const { logger } = require("../Utils/logger");
const { globalConfig } = require("../model/config");
const { makeWASocket, DisconnectReason, delay, isJidBroadcast } = require("@whiskeysockets/baileys");
const { customerModel } = require("../model/customers.types");
const fs = require("fs");
const {parentPort} = require('worker_threads');
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

  async checkAuthentication() {
    // checking authentication 
    if (this.dependencies.userProps.session) {
      const { state, saveCreds } = await this.controller.useMongoDBAuthState(
        wpSessionCollection
      );
      if (!state) {
        logger.Log(
          globalConfig.LogTypes.error,
          globalConfig.LogLocations.all,
          "Session Error"
        );
        return null;
      } else return { state, saveCreds };
    } else {
      logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.all,
        "Session Error"
      );
      return null;
    }
  }
  // Helper function for generating a random delay
  getRandomDelay(min, max) {
    return Math.random() * (max - min) + min;
  }
  async ExecuteProcess() {
    const { state, saveCreds } = await this.checkAuthentication();
  
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
  
          console.log(`Closed connection, status: ${reason} (${status})`)
  
          if (status !== 403 && status === 401 && !status){
            this.ExecuteProcess()
          }
      } else if (connection === 'open'){
        await saveCreds();
        const settings = this.dependencies.userProps.settings;
  
        if (this.counter < this.dependencies.queueItems.length)
        {
          for (const item of this.dependencies.queueItems) {
            const customer = await customerModel.findById(item.customerId);
            const delaySeconds = this.getRandomDelay(
              settings.min_message_delay,
              settings.max_message_delay
            );
            if (customer) {
              const wpId = `${customer.phone}${this.baseIdName}`;
              if (this.isFile && this.isMessage) {
                this.sendFileAndMessage(socket, wpId);
              } else if (this.isFile && !this.isMessage) {
                await this.sendFile(socket, wpId);
              } else if (!this.isFile && this.isMessage) {
                await this.sendMessage(socket, wpId);
              }
              logger.Log(
                globalConfig.LogTypes.info,
                globalConfig.LogLocations.all,
                `Message sent to [${customer._id.toString()}] by [${settings.userId}]`
              );
              await delay(delaySeconds * 1000);
              this.counter++;
              console.log(this.counter);
            }
          }
        }
        else 
          this.closeSocket(socket);
      }
  })

    
  }
  


  async sendFile(socket, customer) {
    this.dependencies.files.map(async (file) => {
      const fullFilePath = `${globalConfig.baseRootPath
        }${this.dependencies.queue._id.toString()}/${file}`;
      await socket.sendMessage(customer, {
        image: { url: fullFilePath },
      });
    });
    socket.cleanDirtyBits()
  }

  async sendMessage(socket, customer) {
    // return success or fail
    const buttonMessage = {
      text:
        this.dependencies.queue.quequeTitle +
        "\n" +
        this.dependencies.queue.quequeMessage,
      footer: "Pro WhatsApp Web",
      headerType: 1,
    };
    await socket.sendMessage(customer, buttonMessage);
    socket.cleanDirtyBits()
  }

  async sendFileAndMessage(socket, customer) {
    await this.sendFile(socket, customer);
    await this.sendMessage(socket, customer);
  }
  closeSocket(socket) {
    socket.end();
    console.log("socket closed")
    parentPort.postMessage('terminate');
    parentPort.off();
  }
  
}
module.exports = { MessageController };
