/***********************************************************************
 *  İŞLEV: Kuyruk islemi icin kuyrukla alakali verileri veri tabanindan toparlar ve gonderim islemi baslatir.
 *  AÇIKLAMA:
 *      Bu class mesaj gonderim kuyrugu icin gerekli olan butun bilgileri toplayarak
 *      - mesaj gonderim servisi besler ve gonderim islemini tetikletir.
 *      - İkinci adımı açıklar
 ***********************************************************************/


//# =============================================================================
//# Library and file imports
//# =============================================================================
const { workerData, parentPort, threadId } = require("worker_threads");
const { queueItemModel } = require("../model/queueItem.types");
const { userModel } = require("../model/user.types");
const { creditsModel } = require("../model/credits.types");
const { globalConfig } = require("../Utils/config");
const { wpSessionCollection } = require("../model/wpSession.types")
const { automationSettingsModel } = require("../model/autoMationSettings.types")
const { default: mongoose } = require("mongoose");
const fs = require("fs");
const path = require("path")
const { logger } = require('../Utils/logger');
const { MessageController } = require("../messageManagement/messageController");
const { QUEUE_STATUS, queueModel } = require("../model/queue.types");



class QueueController {


   /**********************************************
   * Fonksiyon: constructor
   * Açıklama: Ana thread den aldigi queue veri objesini alir ve local degisken olarak kaydeder..
   * Girdi(ler): queue JSON Object
   * Çıktı: NULL
   **********************************************/
  constructor(queue) {
    this.queue = JSON.parse(queue);
    this.currentUser = null;
    this.userDependencies = null;
    this.files = null;
    this.queueItems = null; 
    this.dependencies = null
  }


  /**********************************************
   * Fonksiyon: ExecuteProcess
   * Açıklama: Islem baslatici ana fonksiyon 
   * Girdi(ler): NULL
   * Çıktı: NULL
   **********************************************/
  async ExecuteProcess() {

    //# =============================================================================
    //# make connection to database for Sub thread  
    //# =============================================================================
    await mongoose.connect(globalConfig.mongo_url);
    logger.Log(globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `The Queue process executing for ${this.queue._id.toString()}]`)

    //# =============================================================================
    //# Getting all deps for the queue from local function  
    //# =============================================================================
    const dependencies = await this.InitializeDependencies();

    //# =============================================================================
    //# Check deps exists
    //# =============================================================================
    if (dependencies) {
      try{
        //# =============================================================================
        //# Make queue status to IN_PROGRESS
        //# =============================================================================
        this.queue.status = QUEUE_STATUS.IN_PROGRESS;
        await queueModel.updateOne({_id: this.queue._id}, this.queue);
        let messageController = new MessageController(dependencies)
        await messageController.InitializeSocket();
        process.exit(0)
      }
      catch(error)
      {
        //# =============================================================================
        //# Catching service errors and if necesssary restart the process.
        //# =============================================================================
        logger.Log(globalConfig.LogTypes.error, globalConfig.LogLocations.all, `SISTEM HATASI | ${error}`)
        await this.ExecuteProcess()
      }
    }
  }

  /**********************************************
   * Fonksiyon: InitializeDependencies
   * Açıklama: Bagimliliklari cekme islemini baslata ana yardimci fonksiyon 
   * Girdi(ler): NULL
   * Çıktı: NULL
   **********************************************/
  async InitializeDependencies() {
    try {
      logger.Log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        `Servis aktif kuyruğun bağımlılıklarını toplamaya başladı. [${this.queue._id.toString()}]`
      )
      //# =============================================================================
      //# Get user (Who created the queue)
      //# =============================================================================
      this.currentUser = await userModel.findById(this.queue.userId);
      //# =============================================================================
      //# Check the if not user exists in the system.
      //# =============================================================================
      if (!this.currentUser) {
        logger.Log(globalConfig.LogTypes.error,
          globalConfig.LogLocations.all,
          `Bilinmeyen kullanıcı hatası!!!!`)
        return null;
      }
      //# =============================================================================
      //# Getting user deps (user sessions, credit info, automation settings)
      //# Getting queue files if its exists.
      //# Getting queue items (wp accounts)
      //# =============================================================================
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
      //# =============================================================================
      //# Catching any problem for between service and database (fetch problems)
      //# =============================================================================
      logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.all,
        `Servis hata mesajı: ${err.message.toString()} aktif kuyruk id: [${this.queue._id.toString()}]`
      )
      return null;
    }
  }


  /**********************************************
   * Fonksiyon: getUserDependencies
   * Açıklama: Sistem kullanicisinin bagimliliklarini veri tabanindan ceken yardimci fonksiyon 
   * Girdi(ler): userID
   * Çıktı: {
      credit: credit,
      settings: settings,
      session: this.queue.sessionId
    };
  **********************************************/
  async getUserDependencies(userId) {
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

  /**********************************************
   * Fonksiyon: getQueueItems
   * Açıklama: Mesaj gonderimi yapilacak her kisinin kuyruk icin gerekli olan bilgilerinin veri tabaninda cekildigi yardimci fonksiyon 
   * Girdi(ler): queueId
   * Çıktı: QueueItems (database-model);
  **********************************************/
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

  /**********************************************
   * Fonksiyon: getFiles
   * Açıklama: Kuyruk olusturma sirasinda eklenen medya dosyalarini sandbox ortamindan kuyruk bilgisine gore getiren yardimci fonksiyon 
   * Girdi(ler): queuePath
   * Çıktı: [{ name: fileName, createdAt: stats.birthtime }]
  **********************************************/
  async getFiles(queuePath) {
    const filePath = `${globalConfig.baseRootPath}${queuePath}`;
    try {
      //# =============================================================================
      //# Check Queue file path exists
      //# =============================================================================
      if(fs.existsSync(filePath))
      {
        //# =============================================================================
        //# Read and collect all files inside of current queue
        //# =============================================================================
        const fileNames = await fs.promises.readdir(filePath);
        const filesWithStats = await Promise.all(
          fileNames.map(async (fileName) => {
            //# =============================================================================
            //# Define each file items name and created info
            //# =============================================================================
            const fullPath = path.join(filePath, fileName);
            // 'fs.promises.stat' kullanarak Promise tabanlı yaklaşım
            const stats = await fs.promises.stat(fullPath);
            return { name: fileName, createdAt: stats.birthtime };
          })
        );
        //# =============================================================================
        //# Sorting all files for createdAt
        //# =============================================================================
        filesWithStats.sort((a, b) => a.createdAt - b.createdAt);
        console.log(filesWithStats);
        return filesWithStats;
      }
      else return [];
    } catch (err) {
      //# =============================================================================
      //# Catching read file operation errors
      //# =============================================================================
      console.log(err);
      logger.Log(
        globalConfig.LogTypes.warn,
        globalConfig.LogLocations.consoleAndFile,
        `Bu kuyruk için bir dosya bulunamadı. ${this.queue._id.toString()}`
      );
      return [];
    }
  }
}
  /**********************************************
   * Fonksiyon: message
   * Açıklama: Main threaddi dinleyen "message" event listener
   * Girdi(ler): message
   * Çıktı: NULL
  **********************************************/
parentPort.on("message", async (message) => {
  // listening for start operation 
  // and opening new thread for these workflow
  if (message === "start") {
    const { queue } = workerData;
    //# =============================================================================
    //# Check Queue data exists 
    //# =============================================================================
    if (queue) {
      const controller = new QueueController(queue);
      //# =============================================================================
      //# Execution of the queue proccess 
      //# =============================================================================
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