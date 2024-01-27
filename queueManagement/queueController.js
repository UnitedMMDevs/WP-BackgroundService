const { workerData, parentPort, threadId } = require("worker_threads");
const { queueItemModel } = require("../model/queueItem.types");
const { userModel } = require("../model/user.types");
const { creditsModel } = require("../model/credits.types");
const { globalConfig } = require("../Utils/config");
const { wpSessionCollection } = require("../model/wpSession.types")
const { automationSettingsModel } = require("../model/autoMationSettings.types")
const { default: mongoose } = require("mongoose");
const fs = require("fs");
const { logger } = require('../Utils/logger');
const { MessageController } = require("../messageManagement/messageController");
const { QUEUE_STATUS, queueModel } = require("../model/queue.types");



class QueueController {

  constructor(queue) {
    this.queue = JSON.parse(queue);
    this.currentUser = null;
    this.userDependencies = null;
    this.files = null;
    this.queueItems = null; 
    this.dependencies = null
  }

  async ExecuteProcess() {
    await mongoose.connect(globalConfig.mongo_url);
    logger.Log(globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `The Queue process executing for ${this.queue._id.toString()}]`)
    const dependencies = await this.InitializeDependencies();
    if (dependencies) {
      try{
        this.queue.status = QUEUE_STATUS.IN_PROGRESS;
        await queueModel.updateOne({_id: this.queue._id}, this.queue);
        let messageController = new MessageController(dependencies)
        await messageController.InitializeSocket();
        process.exit(0)
      }
      catch(error)
      {
        logger.Log(globalConfig.LogTypes.error, globalConfig.LogLocations.all, `SISTEM HATASI | ${error}`)
        await this.ExecuteProcess()
      }
    }
  }
  async InitializeDependencies() {
    // this code block
    // collecting all the dependencies for sending message operation to queue
    try {
      logger.Log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        `Servis aktif kuyruğun bağımlılıklarını toplamaya başladı. [${this.queue._id.toString()}]`
      )
      this.currentUser = await userModel.findById(this.queue.userId);
      if (!this.currentUser) {
        logger.Log(globalConfig.LogTypes.error,
          globalConfig.LogLocations.all,
          `Bilinmeyen kullanıcı hatası!!!!`)
        return null;
      }
      this.userDependencies = await this.getUserDependencies(this.currentUser._id.toString());
      this.files = await this.getFiles(this.queue._id.toString());
      this.queueItems = await this.getQueueItems(this.queue._id.toString());
      
      return {
        queue: this.queue,
        userProps: this.userDependencies,
        files: this.files,
        queueItems: this.queueItems,
      };
    } catch (err) {
      logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.all,
        `Servis hata mesajı: ${err.message.toString()} aktif kuyruk id: [${this.queue._id.toString()}]`
      )
      return null;
    }
  }



  async getUserDependencies(userId) {
    // getting all the dependencies of the user
    // credit 
    // settings (automation settings for sending message | delay)
    // session key for the whats app account

    const credit = await creditsModel.findOne({
      userId: userId,
    });
    const settings = await automationSettingsModel.findOne({
      userId: userId,
    });

    return {
      credit: credit,
      settings: settings,
      session: this.queue.sessionId
    };
  }

  async getQueueItems(queueId) {
    // getting all the customers added for this queue
    const queueItems = await queueItemModel.find({
      queueId: queueId,
      spendCredit: 0,
      message_status: ""
    })
    console.log(queueItems.length)
    return queueItems;
  }

  async getFiles(queuePath) {
    // checking files for queue
    const filePath = `${globalConfig.baseRootPath}${queuePath}`;
    try {
      const fileNames = await fs.readdir(filePath);
      const filesWithStats = await Promise.all(
        fileNames.map(async (fileName) => {
          const fullPath = path.join(filePath, fileName);
          const stats = await fs.stat(fullPath);
          return { name: fileName, createdAt: stats.birthtime };
        })
      );
      filesWithStats.sort((a, b) => a.createdAt - b.createdAt);
      return filesWithStats;
    } catch (err) {
      logger.Log(
        globalConfig.LogTypes.warn,
        globalConfig.LogLocations.consoleAndFile,
        `Bu kuyruk için bir dosya bulunamadı. ${this.queue._id.toString()}`
      );
      return [];
    }
  }
}

parentPort.on("message", async (message) => {
  // listening for start operation 
  // and opening new thread for these workflow
  if (message === "start") {
    const { queue } = workerData;
    if (queue) {
      const controller = new QueueController(queue);
      await controller.ExecuteProcess();
    }
  }
  if (message == "pause")
  {
    
  }
  if (message === 'terminate')
  {
    process.exit(0);
  }
});