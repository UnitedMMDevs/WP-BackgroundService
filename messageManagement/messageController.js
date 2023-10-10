const wpClient = require("./wpController");
const { wpSessionCollection, BufferJSON } = require("../model/wpSession.types");
const logger = require("../Utils/logger");
const { globalConfig } = require("../model/config");
const { makeWASocket, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const { customerModel } = require("../model/customers.types");
const fs = require("fs");

class MessageController {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this.controller = new wpClient.WpController(
      this.dependencies.userProps.session
    );
    this.isFile = false;
    this.isMessage = false;
    this.baseIdName = "@s.whatsapp.net";
    this.DefineStrategy();
  }

  DefineStrategy() {
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
    if (this.dependencies.userProps.session) {
      const { state, saveCreds } = await this.controller.useMongoDBAuthState(
        wpSessionCollection
      );
      if (!state) {
        logger.logger.Log(
          globalConfig.LogTypes.error,
          globalConfig.LogLocations.all,
          "Session Error"
        );
        return null;
      } else return { state, saveCreds };
    } else {
      logger.logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.all,
        "Session Error"
      );
      return null;
    }
  }
  async ExecuteProcess() {
    const { state, saveCreds } = await this.checkAuthentication();
    if (state == null) return;
    const socket = makeWASocket({
      printQRInTerminal: true,
      auth: state,
    });
    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const shouldReconnect =
          lastDisconnect.error?.output?.statusCode !==
          DisconnectReason.loggedOut;
        // reconnect if not logged out
        if (shouldReconnect) {
          this.ExecuteProcess();
        }
      } else if (connection === "open") {
        await saveCreds();
        const settings = this.dependencies.userProps.settings;
        const randomDelay =
          Math.random() *
            (settings.max_message_delay - settings.min_message_delay) +
          settings.min_message_delay;
        this.dependencies.queueItems.map(async (item) => {
          const customer = await customerModel.findById(item.customerId);
          if (customer) {
            const wpId = `${customer.phone}${this.baseIdName}`;
            if (this.isFile && this.isMessage) {
              this.sendFileAndMessage(socket, wpId);
            } else if (this.isFile && !this.isMessage) {
              await this.sendFile(socket, wpId);
            } else if (!this.isFile && this.isMessage) {
              await this.sendMessage(socket, wpId);
            }
            logger.logger.Log(
              globalConfig.LogTypes.info,
              globalConfig.LogLocations.all,
              `Message sended to [${customer._id.toString()}] by [${
                settings.userId
              }]`
            );
          }
          await delay(randomDelay * 1000);
        });
      }
    });
    socket.ev.on("messages.upsert", (m) => {
      console.log(m);
    });
  }

  async sendFile(socket, customer) {
    this.dependencies.files.map(async (file) => {
      const fullFilePath = `${
        globalConfig.baseRootPath
      }${this.dependencies.queue._id.toString()}/${file}`;
      await socket.sendMessage(customer, {
        image: { url: fullFilePath },
      });
    });
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
  }

  async sendFileAndMessage(socket, customer) {
    await this.sendFile(socket, customer);
    await this.sendMessage(socket, customer);
  }
}

module.exports = { MessageController };
