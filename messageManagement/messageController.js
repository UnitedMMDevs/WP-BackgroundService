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
} = require('../Utils/wp-utilities');
const { 
  getRandomDelay, 
  defineStatusCheckDelay, 
  getFileType, 
} = require("../Utils/utilties");
const { 
  seperateDataFromUpdate, 
  seperateDataFromUpsert, 
  mergeUpsertUpdateData 
} = require("../modules/handleUpdateEventObject");
const { queueModel, QUEUE_STATUS } = require("../model/queue.types");
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
    this.socket = makeWASocket(socketOptions)
    this.socket.ev.process(async(events) => {
      if (events["connection.update"])
      {
        const {connection, lastDisconnect} = events["connection.update"]
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
          logger.Log(globalConfig.LogTypes.info,
            globalConfig.LogLocations.consoleAndFile,
            `Service Connected to [${this.userProps.credit.userId.toString()}]'s Whatsapp account successfully`
          )
          this.isConnected = true;
          await this.authConfig.saveCreds()
        }
      }

      if(events['creds.update'])
      {
        await this.authConfig.saveCreds()
      }
      if (events['messages.update'])
      {
        const data = events['messages.update']
        logger.Log(globalConfig.LogTypes.info,
          globalConfig.LogLocations.console,
          `Service proccessing update data for messages... | queue => [${this.queue._id.toString()}]`
          )
          if (data)
          {
            console.log(JSON.stringify(data))
            const seperatedData = seperateDataFromUpdate(data)
            const uniqueSeperatedData = seperatedData.filter((item) => 
            {
              return !this.automationUpdates.some((targetItem) => ((targetItem.remoteJid === item.remoteJid) && (targetItem.id === item.id)))
            })
            this.automationUpdates.push(...uniqueSeperatedData);
          }
      }
      if (events['messages.upsert'])
      {
        logger.Log(globalConfig.LogTypes.info,
          globalConfig.LogLocations.console,
          `Service proccessing upsert data for messages... | queue => [${this.queue._id.toString()}]`
        )
        const data = events['messages.upsert']
        if (data)
        {
          console.log(JSON.stringify(data))
          const seperatedData = seperateDataFromUpsert(data)
          const uniqueSeperatedData = seperatedData.filter((item) => 
          {
            return !this.automationUpserts.some((targetItem) => ((targetItem.remoteJid === item.remoteJid) && (targetItem.id === item.id)))
          })
          this.automationUpserts.push(...uniqueSeperatedData);
        } 
      }
    })
    await delay(4 * 1000) // sockete bekleme sureso
    setTimeout(() => {
      
    }, 4 * 1000); // bu process bekleme suresi
    if(this.CheckConnectionSuccess())
      await this.ExecuteAutomation()
    else
      logger.Log(globalConfig.LogTypes.warn,
        globalConfig.LogLocations.all,
        `User WP Account Connection error | ${this.queue.userId.toString()} , Session : [${this.userProps.session}]`
      )
  }
  
  async ExecuteAutomation(){
    const settings = this.userProps.settings;
    await delay(2 * 1000)
    for (const item of this.queueItems) {
      const currentDate = new Date()
      let currentHour = currentDate.getHours()
      let currentMinute = currentDate.getMinutes()

      const condition = !((currentHour > settings.end_Hour || currentHour < settings.start_Hour) ||
      (currentHour === settings.start_Hour && currentMinute < settings.start_Minute) ||
      (currentHour === settings.end_Hour && currentMinute >= settings.end_Minute));
      if (!condition)
      {
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.all,
          `The queue [${this.queue._id.toString()}] exceeded the daily sending hour range, therefore it was stopped by the service.`
        );
        this.queueCompletedState = QUEUE_STATUS.PENDING
        closeSocket(this.socket, parentPort);
        break;
      }
      
      if (this.counter % this.checkStatusPerItem === 0)
      {
        console.log("|||||||||||||||||CHECKED|||||||||||||||||||||")
        const currentState = await queueModel.findById(this.queue._id.toString());
        if (currentState.status === QUEUE_STATUS.PAUSED)
        {
          logger.Log(
            globalConfig.LogTypes.info,
            globalConfig.LogLocations.all,
            `The Queue [${this.queue._id.toString()}] stopped by user [${this.userProps.credit.userId}]`
          );
          closeSocket(this.socket, parentPort);
          this.queueCompletedState = QUEUE_STATUS.PAUSED
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
        const mergedData = mergeUpsertUpdateData(this.automationUpserts, this.automationUpdates)
        await this.AnalysisReceiverDataAndSave(mergedData, customer, item)        
        this.automationUpdates = []
        this.automationUpserts = []
        this.counter++;
      }
    }
    this.queueCompletedState = this.queueCompletedState === QUEUE_STATUS.IN_PROGRESS ? QUEUE_STATUS.COMPLETED : this.queueCompletedState
    this.queue.status = this.queueCompletedState;
    await queueModel.updateOne(
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
    if(this.queueCompletedState === QUEUE_STATUS.COMPLETED)
      closeSocket(this.socket, parentPort)
  }
  
  async SendDataToReceiver(currentReceiver){
    switch(this.strategy)
    {
      case MESSAGE_STRATEGY.JUST_TEXT: //OK 1 credit
      {
        await sendMessage(this.socket, currentReceiver, this.queue.queueMessage)
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
        await sendMessage(this.socket, currentReceiver, this.queue.queueMessage)
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
          await sendMessage(this.socket, currentReceiver, this.queue.queueMessage)
          await sendFile(this.socket, currentReceiver, fullFilePath, extension)
        }
        else
        {
          await sendMediaAndContentMessage(this.socket, currentReceiver, fullFilePath, extension, this.queue.queueMessage)
        }
        break;
      }
    }
    const settings = this.userProps.settings;
    const delaySeconds = getRandomDelay(
      settings.min_message_delay,
      settings.max_message_delay
    );
    await delay(delaySeconds * 1000)
    setTimeout(() => {
      
    }, delaySeconds * 1000);
  }

  async AnalysisReceiverDataAndSave(mergedData, currentCustomer, queueItem){
    // toplanan mesajlarin icinde zaten remoteJid , fromMe degeleri bulunuyor 
    // gonderilen mesajlarin status degelerine bakilarak eger gonderim islemi var ise
    // kredi ayarlamasi yapiliyor olacak o queueItem icin kredi harcamasi girilecek
    // queueItem message_status u girilecek
    // creditTransaction girisi yapilacak
    // user dan kredi dusulmesi yapilacak
    
    let spendCount = 0;
    let extendedMessagesForCustomers = []
    if (mergedData && mergedData.length > 0)
    {
      mergedData.map((mergedItem) => {
        console.log(JSON.stringify(mergedItem, undefined, 2))
        if (mergedItem)
        {
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
        }

      })

      
    }
    else
    {
      spendCount += 1
      extendedMessagesForCustomers.push({
        sent_at: new Date(),
        status: "Delivered",
        message: ""
      })
      logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.all,
        `NO HISTYORY DATA | WARNING | CUSTOMER NO INTERNET CONNECTION`
      );
    }
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `Proccessing data for receiver info |
        User => ${this.queue.userId} | Queue => ${this.queue._id.toString()} | current customer => ${currentCustomer._id.toString()}`
    );
    this.spendCountPerItem = (this.spendCountPerItem !== spendCount && spendCount > 0) ? spendCount : this.spendCountPerItem
    queueItem.spendCredit = (spendCount && spendCount > 0) ? spendCount : this.spendCountPerItem;
    queueItem.message_status = extendedMessagesForCustomers
    await queueItemModel.updateOne({_id: new mongoose.Types.ObjectId(queueItem._id)}, {$set: queueItem})
    this.userProps.credit.totalAmount -= spendCount
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
      `Credit Transaction created. | SPENT | ${this.queue.userId}`
    );
  }
    
  
}
module.exports = { MessageController };
