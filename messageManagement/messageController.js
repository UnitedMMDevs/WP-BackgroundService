/***********************************************************************
 *  İŞLEV: Mesaj gonderim islemini yapan servis
 *  AÇIKLAMA:
 *      Bu kod dosyasinda her bir kullaniciya mesaj gonderen ve gonderim esnasinda
 *   -  veya daha sonrasi gecmis datalari cekip butun gonderim surecini yoneten 
 *    -  siniftir.
 ***********************************************************************/

//# =============================================================================
//# Lib imports
//# =============================================================================
const fs = require("fs");
const { makeWASocket, delay } = require("@whiskeysockets/baileys");
const {
  closeSocket, 
  sendMedia, 
  sendMessage, 
  sendFileAndMessage, 
  checkAuthentication, 
  generateSocketOptions, 
  MESSAGE_STATUS, 
  MESSAGE_STRATEGY, 
  FILE_TYPE, 
  sendMediaAndContentMessage, 
  sendFile,
  defineStrategy,
  isMedia,
  checkReceiverExists,
} = require('../Utils/wp-utilities');
const { 
  getRandomDelay, 
  defineStatusCheckDelay, 
  getFileType,
  deleteFolderRecursive, 
} = require("../Utils/utilties");
const { 
  seperateDataFromUpdate, 
  seperateDataFromUpsert, 
  mergeUpsertUpdateData 
} = require("../modules/handleUpdateEventObject");
const { queueModel, QUEUE_STATUS, QUEUE_STATUS_ERROR_CODES } = require("../model/queue.types");
const events = require("worker/build/main/browser/events");
const { globalConfig } = require("../Utils/config");
const wpClient = require("./wpController");
const { logger } = require("../Utils/logger");
const { customerModel } = require("../model/customers.types");
const {parentPort} = require('worker_threads');
const { queueItemModel } = require("../model/queueItem.types");
const { creditTransactionModel } = require("../model/creditTransaction.types");
const { userModel } = require("../model/user.types");
const { creditsModel } = require("../model/credits.types");
const { default: mongoose } = require("mongoose");
const { generateUniqueCode } = require("../Utils/generateUniqueCode");
const { globalAgent } = require("http");
const { wpSessionCollection } = require("../model/wpSession.types");

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
    console.log('check per item value', this.checkStatusPerItem)
    this.baseIdName = "@s.whatsapp.net";
    this.isConnected = false;
    this.automationUpdates = []
    this.automationUpserts = []
    this.strategy = defineStrategy(this.queue.queueMessage, this.files)
    this.credsUpdated = false
    this.controller = new wpClient.WpController(
      this.userProps.session
    );
    this.queueCompletedState = QUEUE_STATUS.IN_PROGRESS
    this.counter = 0
    this.spendCountPerItem = 0
  }
  /**********************************************
  * Fonksiyon: CheckConnectionSuccess
  * Açıklama: Baglantinin kurulup kurulmadini kontrol eden
  * fonksiyon
  * Girdi(ler): NULL
  * Çıktı: BOOLEAN
  **********************************************/
  async CheckConnectionSuccess(){
    return this.isConnected
  }

  /**********************************************
  * Fonksiyon: InitializeSocket
  * Açıklama: Gerekli ayarlamalari yaparak
  *   - whatsaapp baglantisi icin socket olusturma islemi
  *   - yapan yardimci fonksiyon
  * Girdi(ler): NULL
  * Çıktı: BOOLEAN
  **********************************************/
  async InitializeSocket() {
    logger.Log(globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `Servis aktif kuyruk için socket oluşturma aşamasında.`
    )
    //# =============================================================================
    //# Generating authentication configs 
    //# =============================================================================
    this.authConfig = await checkAuthentication(logger, this.controller, this.userProps.session);
    //# =============================================================================
    //# if authentication not exists than return
    //# =============================================================================
    if (!this.authConfig.state && !this.authConfig.saveCreds) {
      logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.all, `No Session Recorded for this account | ${this.userProps.credit.userId}`);
      return
    
    };
    //# =============================================================================
    //# Generate socket options and create instance of the socket
    //# =============================================================================
    const socketOptions = generateSocketOptions(this.authConfig.state)
    this.socket = makeWASocket(socketOptions)
    this.socket.ev.process(async(events) => {
      if (events["connection.update"])
      {
        //# =============================================================================
        //# Observing connection update event
        //# ============================================================================= 
        const {connection, lastDisconnect} = events["connection.update"]
        const status = lastDisconnect?.error?.output?.statusCode
        console.log("||||||||||||||||||||||| Last disconnect object |||||||||||||||||||||||",JSON.stringify(lastDisconnect, undefined, 2))
        if (connection === 'close'){
            if (!status || (status !== 403 && status !== 401)) {
              //# =============================================================================
              //# If user have session but couldn't connect correctly than try it again.
              //# ============================================================================= 
              this.InitializeSocket()
              logger.Log(globalConfig.LogTypes.info,
                globalConfig.LogLocations.consoleAndFile,
                `Servis kullanıcının whatsapp oturumuna bağlanmaya çalışıyor. [${this.userProps.credit.userId.toString()}]`
              )
            }
            else if (status === 401)
            {
              //# =============================================================================
              //# If user have delete his/her session from whatsapp. You should close the socket.
              //# =============================================================================
              logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.all, "Kullanicinin acik bir oturumu bulunmamaktadir.");
              await wpSessionCollection.deleteOne({ _id: this.userProps.session });
              this.queue.status = `${QUEUE_STATUS.ERROR}|${QUEUE_STATUS_ERROR_CODES.NO_SESSION}`;
              await queueModel.updateOne({_id: new mongoose.Types.ObjectId(this.queue._id)}, {$set: this.queue})
              closeSocket(this.socket, parentPort)
              return;
            }
        }
        else if (connection === 'open'){
            //# =============================================================================
            //# If wp connection has been completed. Save new creds
            //# ============================================================================= 
          logger.Log(globalConfig.LogTypes.info,
            globalConfig.LogLocations.consoleAndFile,
            `Servis kullanıcının whatsapp oturumuna [${this.userProps.credit.userId.toString()}] başarılı şekilde bağlandı.`
          )
          this.isConnected = true;
          await this.authConfig.saveCreds()
        }
      }

      if(events['creds.update'])
      {
        //# =============================================================================
        //# Observing creds.update event. When triggered and change session data than save 
        //# it correct one.
        //# ============================================================================= 
        await this.authConfig.saveCreds()
      }
      if (events['messages.update'])
      {
        //# =============================================================================
        //# Observing messages.update
        //# ============================================================================= 
        const data = events['messages.update']
        logger.Log(globalConfig.LogTypes.info,
          globalConfig.LogLocations.console,
          `Servis bildirimleri kuyruk için toplama işlemi yapıyor. | Kuyruk => [${this.queue._id.toString()}]`
          )
          if (data)
          {
            //# =============================================================================
            //# Check any updates
            //# ============================================================================= 
            console.log(JSON.stringify(data))
            //# =============================================================================
            //# Seperate Which service needs from general update data
            //# ============================================================================= 
            const seperatedData = seperateDataFromUpdate(data)
            const uniqueSeperatedData = seperatedData.filter((item) => 
            {
              //# =============================================================================
              //# Check the array includes same data. If they not add to array.
              //# =============================================================================
              return !this.automationUpdates.some((targetItem) => ((targetItem.remoteJid === item.remoteJid) && (targetItem.id === item.id)))
            })
            this.automationUpdates.push(...uniqueSeperatedData);
          }
      }
      if (events['messages.upsert'])
      {
        //# =============================================================================
        //# Observing messages.upsert
        //# ============================================================================= 
        logger.Log(globalConfig.LogTypes.info,
          globalConfig.LogLocations.console,
          `Servis bildirimleri kuyruk için toplama işlemi yapıyor. | Kuyruk => [${this.queue._id.toString()}]`
        )
        const data = events['messages.upsert']
        if (data)
        {
          //# =============================================================================
          //# Seperate Which service needs from general upsert data
          //# ============================================================================= 
          const seperatedData = seperateDataFromUpsert(data)
          const uniqueSeperatedData = seperatedData.filter((item) => 
          {
            //# =============================================================================
            //# Check the array includes same data. If they not add to array.
            //# =============================================================================
            return !this.automationUpserts.some((targetItem) => ((targetItem.remoteJid === item.remoteJid) && (targetItem.id === item.id)))
          })
          this.automationUpserts.push(...uniqueSeperatedData);
        } 
      }
    })
    //# =============================================================================
    //# Delay before connection succeed
    //# =============================================================================
    await delay(4 * 1000) // sockete bekleme sureso
    setTimeout(() => {
      
    }, 4 * 1000); // bu process bekleme suresi
    //# =============================================================================
    //# Checking connection 
    //# =============================================================================
    if(this.CheckConnectionSuccess())
      await this.ExecuteAutomation()
    else
      logger.Log(globalConfig.LogTypes.warn,
        globalConfig.LogLocations.all,
        `Kullanıcı whatsapp bağlantı hatası. | ${this.queue.userId.toString()} , Oturum : [${this.userProps.session}]`
      )
  }
  /**********************************************
  * Fonksiyon: ExecuteAutomation
  * Açıklama: Otomasyonu baslatan ve mesaj gonderimi
  *   - yapan temel fonksyion
  * Girdi(ler): NULL
  * Çıktı: NULL
  **********************************************/
  async ExecuteAutomation(){
    const settings = this.userProps.settings;
    await delay(2 * 1000)
    for (const item of this.queueItems) {
      //# =============================================================================
      //# Check time interval from user automation settings. 
      //# =============================================================================
      const currentDate = new Date()
      let currentHour = currentDate.getHours()
      let currentMinute = currentDate.getMinutes()

      const condition = ((currentHour > settings.start_Hour && currentHour < settings.end_Hour) ||
      (currentHour === settings.start_Hour && currentMinute >= settings.start_Minute) ||
      (currentHour === settings.end_Hour && currentMinute <= settings.end_Minute));
      if (!condition)
      {
        //# =============================================================================
        //# If proccess out of the time interval. Than make queue status to PAUSED. 
        //# =============================================================================
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.all,
          `Kuyruk [${this.queue._id.toString()}] gönderim zaman aralığını geçti. Servis bu yüzden gönderim işlemini beklemeye aldı.`
        );
        this.queueCompletedState = QUEUE_STATUS.PAUSED
        closeSocket(this.socket, parentPort);
        break;
      }
      
      const currentState = await queueModel.findById(this.queue._id.toString());
      if (currentState.status === QUEUE_STATUS.PAUSED)
      {
        //# =============================================================================
        //# If QUEUE paused by user. Than stop sending message to receivers. 
        //# =============================================================================
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.all,
          `Kuyruk [${this.queue._id.toString()}] kullanıcı tarafından durduruldu. [${this.userProps.credit.userId}]`
        );
        //# =============================================================================
        //# Close connection 
        //# =============================================================================
        closeSocket(this.socket, parentPort);
        this.queueCompletedState = QUEUE_STATUS.PAUSED
        break;
      }
      //# =============================================================================
      //# Check the current receiver blacklisted or graylisted!!! 
      //# =============================================================================
      const checkGrayOrBlackListed = await customerModel.findOne({phone: item.phone, 
        $or: [
          {registeredBlackList: true},
          {registeredGrayList: true}
        ]
      })
      if (checkGrayOrBlackListed)
      {
        let extendedMessagesForCustomers = []
          let info = {
          sent_at: undefined,
          status: undefined,
          message: undefined,
        }
        info.sent_at = new Date()
        info.message = ""
        info.status = (checkGrayOrBlackListed.registeredBlackList && !checkGrayOrBlackListed.registeredGrayList) 
          ? "Bu kullanıcı kara listeye alınmıştır.(Mesaj gönderilmedi.)" : "Bu kullanıcı gri listeye dahil edilmiştir.(Mesaj gönderilmedi.)";
        extendedMessagesForCustomers.push(info);
        item.spendCredit = 0;
        item.message_status = extendedMessagesForCustomers
        await queueItemModel.updateOne({_id: new mongoose.Types.ObjectId(item._id)}, {$set: item})
        logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.all, (checkGrayOrBlackListed.registeredBlackList && !checkGrayOrBlackListed.registeredGrayList) 
        ? "Bu kullanıcı kara listeye alınmıştır." : "Bu kullanıcı gri listeye dahil edilmiştir.");
        continue
      }
      //# =============================================================================
      //# Define current recevier 
      //# =============================================================================
      const currentReceiver = `${item.phone}${this.baseIdName}`;
      //# =============================================================================
      //# Check receiver not really exists 
      //# =============================================================================
      if(!await checkReceiverExists(this.socket, currentReceiver))
      {
          let extendedMessagesForCustomers = []
          let info = {
          sent_at: undefined,
          status: undefined,
          message: undefined,
        }
        info.sent_at = new Date()
        info.message = ""
        info.status = "Böyle bir kullanıcı bulunamadı.(Başarısız)"
        extendedMessagesForCustomers.push(info);
        item.spendCredit = 0;
        item.message_status = extendedMessagesForCustomers
        await queueItemModel.updateOne({_id: new mongoose.Types.ObjectId(item._id)}, {$set: item})
        logger.Log(globalConfig.LogTypes.warn, globalConfig.LogLocations.all, "Boyle bir whatsapp hesabi bulunamadi.");
      }
      else {
          //# =============================================================================
          //# Send data to receiver 
          //# =============================================================================
          await this.SendDataToReceiver(item,currentReceiver)
          logger.Log(
            globalConfig.LogTypes.info,
            globalConfig.LogLocations.all,
            `Bu müşteriye [${item._id.toString()}] mesaj gönderildi. [${settings.userId}]`
          );
          const mergedData = mergeUpsertUpdateData(this.automationUpserts, this.automationUpdates)
          await this.AnalysisReceiverDataAndSave(mergedData, item)        
          this.automationUpdates = []
          this.automationUpserts = []
          this.counter++;
        }
      }
    //# =============================================================================
    //# Complete the queue 
    //# =============================================================================
    this.queueCompletedState = this.queueCompletedState === QUEUE_STATUS.IN_PROGRESS ? QUEUE_STATUS.COMPLETED : this.queueCompletedState
    this.queue.status = this.queueCompletedState;
    await queueModel.updateOne(
      {_id: this.queue._id.toString()},
        {$set:this.queue}
    );
    if (this.queue.status === QUEUE_STATUS.COMPLETED)
    {
      deleteFolderRecursive(`${globalConfig.baseRootPath}${this.queue._id.toString()}`)
      logger.Log(
        globalConfig.LogTypes.info,
        globalConfig.LogLocations.all,
        `Mesaj gönderim işlemi bu kuyruk için başarıyla tamamlandi. 
        | USER [${this.queue.userId}] 
        | QUEUE [${this.queue._id.toString()}] | SESSION [${this.userProps.session}]`
      );
    }
    //# =============================================================================
    //# Close connection after completed 
    //# =============================================================================
    if(this.queueCompletedState !== QUEUE_STATUS.IN_PROGRESS)
      closeSocket(this.socket, parentPort)
  }
  /**********************************************
  * Fonksiyon: SendDataToReceiver
  * Açıklama: Kullaniciya mesaj gonderme islemini
  * yapan ana fonksyion
  * Girdi(ler): queueItem, currentReceiver
  * Çıktı: NULL
  **********************************************/
  async SendDataToReceiver(queueItem, currentReceiver){
    //# =============================================================================
    //# Setting dynamic data from queueMessage 
    //# =============================================================================
    let message = this.queue.queueMessage
    if (queueItem.name !== "" && message.includes("[isim]"))
      message = message.replace("[isim]", queueItem.name)
    if (queueItem.info1 !=="" && message.includes("[bilgi1]"))
      message = message.replace("[bilgi1]", queueItem.info1)
    if (queueItem.info2 !=="" && message.includes("[bilgi2]"))
      message = message.replace("[bilgi2]", queueItem.info2)
    if (queueItem.info3 !== "" && message.includes("[bilgi3]"))
      message = message.replace("[bilgi3]", queueItem.info3)

    const settings = this.userProps.settings;
    //# =============================================================================
    //# Check user wants to use spam code or not 
    //# =============================================================================
    if ((settings.useSpamCode !== undefined) && settings.useSpamCode === true)
    {
      message = message + generateUniqueCode();
    }
      //# =============================================================================
      //# Defining strategy and run proccess for this strategy 
      //# =============================================================================
      switch(this.strategy)
      {
        case MESSAGE_STRATEGY.JUST_TEXT: //OK 1 credit
        {
          //# =============================================================================
          //# Send single message 
          //# =============================================================================
          await sendMessage(this.socket, currentReceiver, message)
          break;
        }
        case MESSAGE_STRATEGY.JUST_FILE: // OK 1 credit
        {
        //# =============================================================================
        //# Send single file 
        //# =============================================================================
        const extension = getFileType(this.files[0].name)
        const file_type = isMedia(extension)
        const fullFilePath = `${globalConfig.baseRootPath
        }${this.queue._id.toString()}/${this.files[0].name}`;
        if(file_type === FILE_TYPE.MEDIA)
          await sendMedia(this.socket, currentReceiver, fullFilePath, extension)
        else {
          await sendFile(this.socket, currentReceiver, fullFilePath, extension)
        }
        break;
        }
        case MESSAGE_STRATEGY.MULTIPLE_FILE:
        {
          //# =============================================================================
          //# Send multiple file 
          //# =============================================================================
          this.files.map(async(file) => {
            const extension = getFileType(file.name)
            const file_type = isMedia(extension)
            const fullFilePath = `${globalConfig.baseRootPath
            }${this.queue._id.toString()}/${file.name}`;
            if(file_type === FILE_TYPE.MEDIA)
            await sendMedia(this.socket, currentReceiver, fullFilePath, extension)
            else{
              await sendFile(this.socket, currentReceiver, fullFilePath, extension)
            }
          })
          break;
        }
        case MESSAGE_STRATEGY.MULTIPLE_FILE_MESSAGE:
        {
          //# =============================================================================
          //# Send multiple file and message  
          //# =============================================================================
          this.files.map(async(file) => {
            const extension = getFileType(file.name)
            const file_type = isMedia(extension)
            const fullFilePath = `${globalConfig.baseRootPath
            }${this.queue._id.toString()}/${file.name}`;
            if(file_type === FILE_TYPE.MEDIA)
              await sendMedia(this.socket, currentReceiver, fullFilePath, extension)
            else {
              await sendFile(this.socket, currentReceiver, fullFilePath, extension)
            }
          })
          
          await sendMessage(this.socket, currentReceiver, message)
          break;
        }
        case MESSAGE_STRATEGY.ONE_FILE_MESSAGE:
        {
          //# =============================================================================
          //# Send single file and single message 
          //# =============================================================================
          const extension = getFileType(this.files[0].name)
          const file_type = isMedia(extension)
          const fullFilePath = `${globalConfig.baseRootPath
          }${this.queue._id.toString()}/${this.files[0].name}`;
          if(file_type === FILE_TYPE.FILE)
          {
            await sendFile(this.socket, currentReceiver, fullFilePath, extension)
            await sendMessage(this.socket, currentReceiver, message)
          }
          else
          {
            await sendMediaAndContentMessage(this.socket, currentReceiver, fullFilePath, extension, message)
          }
          break;
        }
      }
      //# =============================================================================
      //# Delay before sending next receiver 
      //# =============================================================================
      const delaySeconds = getRandomDelay(
        settings.min_message_delay,
        settings.max_message_delay
      );
      await delay(delaySeconds * 1000)
      setTimeout(() => {
        
      }, delaySeconds * 1000);
  }
  /**********************************************
  * Fonksiyon: AnalysisReceiverDataAndSave
  * Açıklama: Gecmis datasi ve gonderimden sonra
  *   -  kredi guncelleme islemlerinin yapilmasi icin analiz
  *   -   fonksiyonu
  * Girdi(ler): mergedData, queueItem
  * Çıktı: NULL
  **********************************************/
  async AnalysisReceiverDataAndSave(mergedData, queueItem){
    
    let spendCount = 0;
    let extendedMessagesForCustomers = []
    if (mergedData && mergedData.length > 0)
    {
      mergedData.map((mergedItem) => {
        console.log(JSON.stringify(mergedItem, undefined, 2))
        if (mergedItem)
        {
          if(mergedItem.remoteJid === `${queueItem.phone}${this.baseIdName}`)
          {
            let info = {
              sent_at: undefined,
              status: undefined,
              message: undefined,
            }
            info.sent_at = new Date(mergedItem.sendAt.low * 1000)
            info.message = Object.keys(mergedItem.message)[0]
            //# =============================================================================
            //# Defining send status by mergedItem 
            //# =============================================================================
            if(mergedItem.status === MESSAGE_STATUS.ERROR)
            {
              spendCount += 0;
              info.status = "Gönderilemedi. (Başarısız)"
            }
            else {
              spendCount += 1
              if (mergedItem.status === MESSAGE_STATUS.DELIVERY_ACK)
                info.status = "İletildi. (Başarılı)"
              else if(mergedItem.status === MESSAGE_STATUS.PENDING)
                info.status = "Bekliyor.(Başarılı)"
              else if(mergedItem.status === MESSAGE_STATUS.PLAYED)
                info.status = "İzlendi. (Başarılı)"
              else if(mergedItem.status === MESSAGE_STATUS.READ)
                info.status = "Okundu. (Başarılı)"
              else if(mergedItem.status === MESSAGE_STATUS.SERVER_ACK)
                info.status = "İletildi. (Başarılı)"
            }
            extendedMessagesForCustomers.push(info)
          }
        }

      })

      
    }
    else
    {
      //# =============================================================================
      //# Setting history data 
      //# =============================================================================
      spendCount += 1
      extendedMessagesForCustomers.push({
        sent_at: new Date(),
        status: "Gönderildi. (Başarılı)",
        message: ""
      })
      logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.all,
        `GEÇMİŞ DATASI BULUNMUYOR | UYARI | MÜŞTERİNİN INTERNET BAĞLANTISI YOK.`
      );
    }
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `Müşteri bilgileri için veri işleniyor. |
        Kullanıcı => ${this.queue.userId} | Kuyruk => ${this.queue._id.toString()} | o andaki müşteri => ${queueItem._id.toString()}`
    );
    //# =============================================================================
    //# Update queueItem for history data and update spend credit amount 
    //# =============================================================================
    this.spendCountPerItem = (this.spendCountPerItem !== spendCount && spendCount > 0) ? spendCount : this.spendCountPerItem
    queueItem.spendCredit = (spendCount && spendCount > 0) ? spendCount : this.spendCountPerItem;
    queueItem.message_status = extendedMessagesForCustomers
    await queueItemModel.updateOne({_id: new mongoose.Types.ObjectId(queueItem._id)}, {$set: queueItem})
    this.userProps.credit.totalAmount -= spendCount
    //# =============================================================================
    //# Decerease credit from user and set new transaction as spent type 
    //# =============================================================================
    await creditsModel.updateOne({_id:  new mongoose.Types.ObjectId(this.userProps.credit._id)}, {$set: this.userProps.credit})
    await creditTransactionModel.create({
      user_id: this.userProps.credit.userId.toString(),
      amount: (spendCount && spendCount > 0) ? spendCount : this.spendCountPerItem,
      transaction_date: new Date(Date.now()),
      transaction_type: "spent"
    })
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.all,
      `Kredi hareket işlemi gerçekleştirildi. | ${this.queue.userId}`
    );
  }
    
  
}
module.exports = { MessageController };
