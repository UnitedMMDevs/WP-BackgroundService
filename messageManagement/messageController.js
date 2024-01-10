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
  sendFile
} = require('../Utils/wp-utilities');
const { 
  getRandomDelay, 
  defineStatusCheckDelay, 
  defineStrategy, 
  getFileType, 
  isMedia
} = require("../Utils/utilties");
const { 
  seperateDataFromUpdate, 
  seperateDataFromUpsert, 
  mergeUpsertUpdateData 
} = require("../modules/handleUpdateEventObject");
const { quequeModel, QUEUE_STATUS } = require("../model/queque.types");
const events = require("worker/build/main/browser/events");
const { globalConfig } = require("../Utils/config");
const wpClient = require("./wpController");
const { logger } = require("../Utils/logger");
const { customerModel } = require("../model/customers.types");
const {parentPort} = require('worker_threads');
const { quequeItemModel } = require("../model/quequeItem.types");
const { creditTransactionModel } = require("../model/creditTransaction.types");
const { userModel } = require("../model/user.types");
const { creditsModel } = require("../model/credits.types");
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
    this.otomationUpserts = []
    this.strategy = defineStrategy(this.queue.quequeMessage, this.files)

    this.controller = new wpClient.WpController(
      this.userProps.session
    );
    
    
  }
  async CheckConnectionSuccess(){
    return this.isConnected
  }

  async InitializeSocket() {
    logger.Log(globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `Socket initializing process start...`
    )
    this.authConfig = await checkAuthentication(logger, this.controller, this.userProps.session);
    if (!this.authConfig.state && !this.authConfig.saveCreds) return;
    const socketOptions = generateSocketOptions(this.authConfig.state)
    this.socket = makeWASocket(socketOptions);
    this.socket.ev.on('connection.update',  async ({ connection, lastDisconnect }) =>{
      const status = lastDisconnect?.error?.output?.statusCode
      if (connection === 'close'){
          if (status !== 403 && status === 401 && !status){
            this.InitializeSocket()
            logger.Log(globalConfig.LogTypes.info,
              globalConfig.LogLocations.consoleAndFile,
              `Service retry connect to [${this.userProps.credit.userId.toString()}]'s Whatsapp account successfully`
            )
          }
      }
      else if (connection === 'open'){
        await this.authConfig.saveCreds()
        logger.Log(globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          `Service Connected to [${this.userProps.credit.userId.toString()}]'s Whatsapp account successfully`
        )
        this.isConnected = true;
      }
    })
    this.socket.ev.on('creds.update', this.authConfig.saveCreds)
    this.socket.ev.on('messages.update', async (update) => {
      logger.Log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.console,
        `Service proccessing update data for messages... | queue => [${this.queue._id.toString()}]`
      )
      const seperatedData = seperateDataFromUpdate(update)
      const uniqueSeperatedData = seperatedData.filter((item) => 
      {
        return !this.otomationUpdates.some((targetItem) => ((targetItem.remoteJid === item.remoteJid) && (targetItem.id === item.id)))
      })
      this.otomationUpdates.push(...uniqueSeperatedData);
    })
    this.socket.ev.on('messages.upsert', async (update) => {
      logger.Log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.console,
        `Service proccessing upsert data for messages... | queue => [${this.queue._id.toString()}]`
      )
      const seperatedData = seperateDataFromUpsert(update);
      const uniqueSeperatedData = seperatedData.filter((item) => 
      {
        return !this.otomationUpdates.some((targetItem) => ((targetItem.remoteJid === item.remoteJid) && (targetItem.id === item.id)))
      })
      this.otomationUpserts.push(...uniqueSeperatedData);     
    })
    setTimeout(async() => {

    }, 5000);
    if(this.CheckConnectionSuccess())
      await this.ExecuteOtomation()
    else
      logger.Log(globalConfig.LogTypes.warn,
        globalConfig.LogLocations.all,
        `User WP Account Connection error | ${this.queue.userId.toString()} , Session : [${this.userProps.session}]`
      )
  }
  
  async ExecuteOtomation(){
    const settings = this.userProps.settings;
    const delaySeconds = getRandomDelay(
      settings.min_message_delay,
      settings.max_message_delay
    );
    await delay(delaySeconds * 1000);
    for (const item of this.queueItems) {
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
        const delaySeconds = getRandomDelay(
          settings.min_message_delay,
          settings.max_message_delay
        );
        await delay(delaySeconds * 1000);
        const mergedData = mergeUpsertUpdateData(this.otomationUpserts, this.otomationUpdates)
        await this.AnalyseReceiverDataAndSave(mergedData, customer, item)
        this.otomationUpdates = []
        this.otomationUpserts = []
      }
    }
    this.queue.status = QUEUE_STATUS.COMPLETED;
    await quequeModel.updateOne(
      {_id: this.queue._id.toString()},
        {$set:this.queue}
    );
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.all,
      `The Queue has been completed. 
      | USER [${this.queue.userId}] 
      | QUEUE [${this.queue._id.toString()}] | SESSION [${this.userProps.session}]`
    );
  }
  
  async SendDataToReceiver(currentReceiver){
    switch(this.strategy)
    {
      case MESSAGE_STRATEGY.JUST_TEXT: //OK 1 credit
      {
        await sendMessage(this.socket, currentReceiver, this.queue.quequeMessage)
        break;
      }
      case MESSAGE_STRATEGY.JUST_FILE: // OK 1 credit
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
      case MESSAGE_STRATEGY.MULTIPLE_FILE:
      {
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
      case MESSAGE_STRATEGY.MULTIPLE_FILE_MESSAGE:
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
      case MESSAGE_STRATEGY.ONE_FILE_MESSAGE:
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

  async AnalyseReceiverDataAndSave(mergedData, currentCustomer, queueItem){
    // toplanan mesajlarin icinde zaten remoteJid , fromMe degeleri bulunuyor 
    // gonderilen mesajlarin status degelerine bakilarak eger gonderim islemi var ise
    // kredi ayarlamasi yapiliyor olacak o queueItem icin kredi harcamasi girilecek
    // queueItem message_status u girilecek
    // creditTransaction girisi yapilacak
    // user dan kredi dusulmesi yapilacak

    let spendCount = 0;
    let extendedMessagesForCustomers = []
    mergedData.map((mergedItem) => {
      if(mergedItem.remoteJid === `${currentCustomer.phone}${this.baseIdName}`)
      {
        let info = {
          sent_at: undefined,
          status: undefined,
          message: undefined,
        }
        info.sent_at = new Date(mergedItem.sendAt.low * 1000)
        info.message = Object.keys(mergedItem.message)[0]
        if(mergedItem.status === MESSAGE_STATUS.ERROR)
        {
          spendCount += 0;
          info.status = "Not Sent"
          
        }
        else {
          spendCount += 1
          if (mergedItem.status === MESSAGE_STATUS.DELIVERY_ACK)
            info.status = "Sent"
          else if(mergedItem.status === MESSAGE_STATUS.PENDING)
            info.status = "Pending"
          else if(mergedItem.status === MESSAGE_STATUS.PLAYED)
            info.status = "Played"
          else if(mergedItem.status === MESSAGE_STATUS.READ)
            info.status = "Read"
          else if(mergedItem.status === MESSAGE_STATUS.SERVER_ACK)
            info.status = "Sent"
        }
        extendedMessagesForCustomers.push(info)
      }
    })
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `Proccessing data for receiver info |
       User => ${this.queue.userId} | Queue => ${this.queue._id.toString()}
       | Customer => ${this.queueItems.customerId}`
    );
    queueItem.spendCredit = spendCount;
    queueItem.message_status = JSON.stringify(extendedMessagesForCustomers, undefined, 2)
    await quequeItemModel.updateOne({_id: queueItem._id}, queueItem)
    this.userProps.credit.totalAmount -= spendCount
    await creditsModel.updateOne({_id: this.userProps.credit._id}, this.userProps.credit)
    if(spendCount > 0)
      await creditTransactionModel.create({
        user_id: this.userProps.credit.userId.toString(),
        amount: spendCount,
        transaction_date: new Date(Date.now()),
        transaction_type: "spent"
      })
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.all,
      `Credit Transaction created. | SPENT | ${this.queue.userId}`
    );
  }
}
module.exports = { MessageController };
