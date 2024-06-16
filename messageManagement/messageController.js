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
const {
  makeWASocket,
  delay,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
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
  delayForProcess,
  delayForProcessOverride,
} = require("../Utils/wp-utilities");
const {
  getRandomDelay,
  defineStatusCheckDelay,
  getFileType,
  deleteFolderRecursive,
  generateTextMessageForWP,
} = require("../Utils/utilties");
const {
  seperateDataFromUpdate,
  seperateDataFromUpsert,
  mergeUpsertUpdateData,
  generateExtendedMessages,
  defineStatusAndInfoFromHistoryData,
} = require("../modules/handleUpdateEventObject");
const {
  queueModel,
  QUEUE_STATUS,
  QUEUE_STATUS_ERROR_CODES,
} = require("../model/queue.types");
const events = require("worker/build/main/browser/events");
const { globalConfig } = require("../Utils/config");
const wpClient = require("./wpController");
const { logger } = require("../Utils/logger");
const { customerModel } = require("../model/customers.types");
const { parentPort } = require("worker_threads");
const { queueItemModel } = require("../model/queueItem.types");
const { creditTransactionModel } = require("../model/creditTransaction.types");
const { userModel } = require("../model/user.types");
const { creditsModel } = require("../model/credits.types");
const { default: mongoose } = require("mongoose");
const { generateUniqueCode } = require("../Utils/generateUniqueCode");
const { globalAgent } = require("http");
const { wpSessionCollection } = require("../model/wpSession.types");
const { RuleChecker } = require("../modules/ruleChecker");
const { NotificationModule } = require("../modules/notificationModule");
const { NOTIFICATION_TYPES } = require("../Utils/constants");
const { notificationConfigModel } = require("../model/noticationConfiguration");
const { userNotificationSettingsModel } = require("../model/userNotificationSettings.types");
class MessageController {
  constructor({ queue, userProps, files, queueItems }) {
    // defining all dependencies
    this.queue = queue;
    this.userProps = userProps;
    this.files = files;
    this.queueItems = queueItems;
    this.checkStatusPerItem = defineStatusCheckDelay(this.queueItems.length);
    this.baseIdName = "@s.whatsapp.net";
    this.isConnected = false;
    this.automationUpdates = [];
    this.automationUpserts = [];
    this.strategy = defineStrategy(this.queue.queueMessage, this.files);
    this.credsUpdated = false;
    this.controller = new wpClient.WpController(this.userProps.session);
    this.queueCompletedState = QUEUE_STATUS.IN_PROGRESS;
    this.counter = 0;
    this.spendCountPerItem = 0;
    this.isSending = false;
  }
  /**********************************************
   * Fonksiyon: CheckConnectionSuccess
   * Açıklama: Baglantinin kurulup kurulmadini kontrol eden
   * fonksiyon
   * Girdi(ler): NULL
   * Çıktı: BOOLEAN
   **********************************************/
  async CheckConnectionSuccess() {
    return this.isConnected;
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
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `Servis aktif kuyruk için socket oluşturma aşamasında.`
    );
    //# =============================================================================
    //# Generating authentication configs
    //# =============================================================================
    this.authConfig = await checkAuthentication(
      logger,
      this.controller,
      this.userProps.session
    );
    //# =============================================================================
    //# if authentication not exists than return
    //# =============================================================================
    if (!this.authConfig.state && !this.authConfig.saveCreds) {
      logger.Log(
        globalConfig.LogTypes.warn,
        globalConfig.LogLocations.consoleAndFile,
        `No Session Recorded for this account | ${this.userProps.credit.userId}`
      );
      return;
    }
    //# =============================================================================
    //# Generate socket options and create instance of the socket
    //# =============================================================================
    const socketOptions = generateSocketOptions(this.authConfig.state);
    this.socket = makeWASocket(socketOptions);

    this.socket.ev.process(async (events) => {
      if (events["connection.update"]) {
        //# =============================================================================
        //# Observing connection update event
        //# =============================================================================
        const { connection, lastDisconnect } = events["connection.update"];
        const status = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = status !== DisconnectReason.loggedOut;
        if (connection === "close") {
          if (status === DisconnectReason.loggedOut) {
            //# =============================================================================
            //# If user have delete his/her session from whatsapp. You should close the socket.
            //# =============================================================================
            logger.Log(
              globalConfig.LogTypes.warn,
              globalConfig.LogLocations.consoleAndFile,
              "Kullanicinin acik bir oturumu bulunmamaktadir."
            );
            await wpSessionCollection.deleteOne({
              _id: this.userProps.session,
            });
            this.queue.status = `${QUEUE_STATUS.ERROR}|${QUEUE_STATUS_ERROR_CODES.NO_SESSION}`;
            await queueModel.updateOne(
              { _id: new mongoose.Types.ObjectId(this.queue._id) },
              { $set: this.queue }
            );
            let config = (await notificationConfigModel.find({}))[0];
            let userSettings = await userNotificationSettingsModel.findOne({
              userId: this.queue.userId,
            });
            if (userSettings) {
              await NotificationModule.notify(
                NOTIFICATION_TYPES.QUEUE_ERROR,
                JSON.parse(config.queueErrorObj).sent_type,
                this.queue._id.toString(), userSettings
              );
            }
            
            closeSocket(this.socket, parentPort);
            return;
          } else if (status === 440) {
            //# =============================================================================
            //# If user try to use same whatsapp account more than once. You should close the socket.
            //# checking conflict.
            //# =============================================================================
            logger.Log(
              globalConfig.LogTypes.warn,
              globalConfig.LogLocations.con,
              "Kullani oturumunu ayni anda kullanmaya calisiyor/"
            );
            this.queue.status = `${QUEUE_STATUS.ERROR}|${QUEUE_STATUS_ERROR_CODES.CONFLICT}`;
            await queueModel.updateOne(
              { _id: new mongoose.Types.ObjectId(this.queue._id) },
              { $set: this.queue }
            );
            let config = (await notificationConfigModel.find({}))[0];
            let userSettings = await userNotificationSettingsModel.findOne({
              userId: this.queue.userId,
            });
            if (userSettings) {
              await NotificationModule.notify(
                NOTIFICATION_TYPES.QUEUE_ERROR,
                JSON.parse(config.queueErrorObj).sent_type,
                this.queue._id.toString(), userSettings
              );
            }
            closeSocket(this.socket, parentPort);
          } else if (shouldReconnect) {
            //# =============================================================================
            //# If user have session but couldn't connect correctly than try it again.
            //# =============================================================================
            this.isSending = false;
            this.InitializeSocket();
            logger.Log(
              globalConfig.LogTypes.info,
              globalConfig.LogLocations.consoleAndFile,
              `Servis kullanıcının whatsapp oturumuna bağlanmaya çalışıyor. [${this.userProps.credit.userId.toString()}]`
            );
          }
        } else if (connection === "open") {
          //# =============================================================================
          //# If wp connection has been completed. Save new creds
          //# =============================================================================
          logger.Log(
            globalConfig.LogTypes.info,
            globalConfig.LogLocations.consoleAndFile,
            `Servis kullanıcının whatsapp oturumuna [${this.userProps.credit.userId.toString()}] başarılı şekilde bağlandı.`
          );
          this.isConnected = true;
        }
        if (
          events["connection.update"].receivedPendingNotifications &&
          !this.isSending
        ) {
          await this.ExecuteAutomation();
          this.isSending = true;
        }
      }

      if (events["creds.update"]) {
        //# =============================================================================
        //# Observing creds.update event. When triggered and change session data than save
        //# it correct one.
        //# =============================================================================
        await this.authConfig.saveCreds();
        await delayForProcessOverride(getRandomDelay(0.4, 1.4));
      }
      if (events["messages.update"]) {
        //# =============================================================================
        //# Observing messages.update
        //# =============================================================================
        const data = events["messages.update"];
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.console,
          `Servis bildirimleri kuyruk için toplama işlemi yapıyor. | Kuyruk => [${this.queue._id.toString()}]`
        );
        if (data) {
          //# =============================================================================
          //# Check any updates
          //# =============================================================================
          //# =============================================================================
          //# Seperate Which service needs from general update data
          //# =============================================================================
          const seperatedData = seperateDataFromUpdate(data);
          const uniqueSeperatedData = seperatedData.filter((item) => {
            //# =============================================================================
            //# Check the array includes same data. If they not add to array.
            //# =============================================================================
            return !this.automationUpdates.some(
              (targetItem) =>
                targetItem.remoteJid === item.remoteJid &&
                targetItem.id === item.id
            );
          });
          this.automationUpdates.push(...uniqueSeperatedData);
          await delayForProcessOverride(getRandomDelay(0.4, 1.4));
        }
      }
      if (events["messages.upsert"]) {
        //# =============================================================================
        //# Observing messages.upsert
        //# =============================================================================
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.console,
          `Servis bildirimleri kuyruk için toplama işlemi yapıyor. | Kuyruk => [${this.queue._id.toString()}]`
        );
        const data = events["messages.upsert"];
        const chat = data.messages[0];
        if (chat.key.remoteJid.includes("status@broadcast")) return;
        if (data) {
          //# =============================================================================
          //# Seperate Which service needs from general upsert data
          //# =============================================================================
          const seperatedData = seperateDataFromUpsert(data);
          const uniqueSeperatedData = seperatedData.filter((item) => {
            //# =============================================================================
            //# Check the array includes same data. If they not add to array.
            //# =============================================================================
            return !this.automationUpserts.some(
              (targetItem) =>
                targetItem.remoteJid === item.remoteJid &&
                targetItem.id === item.id
            );
          });
          this.automationUpserts.push(...uniqueSeperatedData);
          await delayForProcessOverride(getRandomDelay(0.4, 1.4));
        }
      }
    });
  }
  /**********************************************
   * Fonksiyon: ExecuteAutomation
   * Açıklama: Otomasyonu baslatan ve mesaj gonderimi
   *   - yapan temel fonksyion
   * Girdi(ler): NULL
   * Çıktı: NULL
   **********************************************/

  async ExecuteAutomation() {
    const settings = this.userProps.settings;
    await delay(2 * 1000);
    for (let item of this.queueItems) {
      if (item.spendCredit > 0) continue;
      if (!RuleChecker.checkTimeIntervalForUser(settings)) {
        //# =============================================================================
        //# If proccess out of the time interval. Than make queue status to PAUSED.
        //# =============================================================================
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          `Kuyruk [${this.queue._id.toString()}] gönderim zaman aralığını geçti. Servis bu yüzden gönderim işlemini beklemeye aldı.`
        );
        //# =============================================================================
        //# Update QUEUE FOR STATUS
        //# =============================================================================
        this.queueCompletedState = QUEUE_STATUS.PAUSED;
        this.queue.status = this.queueCompletedState;
        await queueModel.updateOne(
          { _id: this.queue._id.toString() },
          { $set: this.queue }
        );
        //# =============================================================================
        //# Close connection
        //# =============================================================================
        closeSocket(this.socket, parentPort);
        break;
      }
      if (await RuleChecker.checkQueueHasAProblem(this.queue, queueModel)) {
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          `Kuyruk [${this.queue._id.toString()}] Hatali oldugu icin durduruluyor. [${
            this.userProps.credit.userId
          }]`
        );

        closeSocket(this.socket, parentPort);
      }
      if (await RuleChecker.checkUserCreditAmountZero(this.userProps.credit.userId, creditsModel)){
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          `Kuyruk [${this.queue._id.toString()}] Yetersiz Kredi. [${
            this.userProps.credit.userId
          }]`
        );
        this.queueCompletedState = `${QUEUE_STATUS.ERROR}|"Yetersiz Kredi"`;
        this.queue.status = this.queueCompletedState;
        await queueModel.updateOne(
          { _id: this.queue._id.toString() },
          { $set: this.queue }
        );
        //# =============================================================================
        //# Close connection
        //# =============================================================================
        closeSocket(this.socket, parentPort);

        break;
      }
      if (await RuleChecker.checkQueuePausedByUser(this.queue, queueModel)) {
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          `Kuyruk [${this.queue._id.toString()}] kullanıcı tarafından durduruldu. [${
            this.userProps.credit.userId
          }]`
        );
        //# =============================================================================
        //# Update QUEUE FOR STATUS
        //# =============================================================================
        this.queueCompletedState = QUEUE_STATUS.PAUSED;
        this.queue.status = this.queueCompletedState;
        await queueModel.updateOne(
          { _id: this.queue._id.toString() },
          { $set: this.queue }
        );
        //# =============================================================================
        //# Close connection
        //# =============================================================================
        closeSocket(this.socket, parentPort);

        break;
      }
      const checkGrayOrBlackListed =
        await RuleChecker.checkUserBlacklistedOrGrayListed(
          item,
          customerModel,
          this.userProps.credit.userId
        );
      if (checkGrayOrBlackListed) {
        //# =============================================================================
        //# Pass the blacklisted or graylisted user.
        //# =============================================================================
        let extendedMessagesForCustomers = [];
        extendedMessagesForCustomers = generateExtendedMessages(
          extendedMessagesForCustomers,
          new Date(),
          "",
          checkGrayOrBlackListed.registeredBlackList &&
            !checkGrayOrBlackListed.registeredGrayList
            ? "Bu kullanıcı kara listeye alınmıştır.(Mesaj gönderilmedi.)"
            : "Bu kullanıcı gri listeye dahil edilmiştir.(Mesaj gönderilmedi.)"
        );
        item.spendCredit = 0;
        item.message_status = extendedMessagesForCustomers;
        await queueItemModel.updateOne(
          { _id: new mongoose.Types.ObjectId(item._id) },
          { $set: item }
        );
        logger.Log(
          globalConfig.LogTypes.warn,
          globalConfig.LogLocations.consoleAndFile,
          checkGrayOrBlackListed.registeredBlackList &&
            !checkGrayOrBlackListed.registeredGrayList
            ? "Bu kullanıcı kara listeye alınmıştır."
            : "Bu kullanıcı gri listeye dahil edilmiştir."
        );
        continue;
      }
      //# =============================================================================
      //# Define current recevier
      //# =============================================================================
      const currentReceiver = `${item.phone}${this.baseIdName}`;

      if (
        !(await RuleChecker.checkWpAccountExists(this.socket, currentReceiver))
      ) {
        //# =============================================================================
        //# Pass the wp user if doesnt exists.
        //# =============================================================================
        let extendedMessagesForCustomers = [];
        extendedMessagesForCustomers = generateExtendedMessages(
          extendedMessagesForCustomers,
          new Date(),
          "",
          "Böyle bir kullanıcı bulunamadı.(Başarısız)"
        );
        item.spendCredit = 0;
        item.message_status = extendedMessagesForCustomers;
        await queueItemModel.updateOne(
          { _id: new mongoose.Types.ObjectId(item._id) },
          { $set: item }
        );
        logger.Log(
          globalConfig.LogTypes.warn,
          globalConfig.LogLocations.consoleAndFile,
          "Boyle bir whatsapp hesabi bulunamadi."
        );
        continue;
      }
      const checkBlocked = await RuleChecker.checkBlockedUser(
        this.socket,
        currentReceiver
      );
      if (checkBlocked) {
        let extendedMessagesForCustomers = [];
        extendedMessagesForCustomers = generateExtendedMessages(
          extendedMessagesForCustomers,
          new Date(),
          "",
          "Bu kullanıcı engellenmiştir. (Mesaj gönderilemedi.)"
        );
        item.spendCredit = 0;
        item.message_status = extendedMessagesForCustomers;
        await queueItemModel.updateOne(
          { _id: new mongoose.Types.ObjectId(item._id) },
          { $set: item }
        );
        logger.Log(
          globalConfig.LogTypes.warn,
          globalConfig.LogLocations.consoleAndFile,
          "Bu kullanıcı engellenmiştir."
        );
        continue;
      }
      //# =============================================================================
      //# Send data to receiver
      //# =============================================================================
      await this.SendDataToReceiver(item, currentReceiver);
      logger.Log(
        globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        `Bu müşteriye [${item._id.toString()}] mesaj gönderildi. [${
          settings.userId
        }]`
      );
      const mergedData = mergeUpsertUpdateData(
        this.automationUpserts,
        this.automationUpdates
      );
      item = await this.AnalysisReceiverDataAndSave(mergedData, item);
      this.automationUpdates = [];
      this.automationUpserts = [];
      this.counter++;
    }
    //# =============================================================================
    //# Complete the queue
    //# =============================================================================
    this.queueCompletedState =
      this.queueCompletedState === QUEUE_STATUS.IN_PROGRESS
        ? QUEUE_STATUS.COMPLETED
        : this.queueCompletedState;
    this.queue.status = this.queueCompletedState;
    await queueModel.updateOne(
      { _id: this.queue._id.toString() },
      { $set: this.queue }
    );
    if (this.queue.status === QUEUE_STATUS.COMPLETED) {
      deleteFolderRecursive(
        `${globalConfig.baseRootPath}${this.queue._id.toString()}`
      );
      let config = (await notificationConfigModel.find({}))[0];
      let userSettings = await userNotificationSettingsModel.findOne({
        userId: this.queue.userId,
      });
      if (userSettings) {
        await NotificationModule.notify(
          NOTIFICATION_TYPES.QUEUE_HAS_BEEN_FINISHED,
          JSON.parse(config.queueFinishedObj).sent_type,
          this.queue._id.toString(),
          userSettings
        );
      }
      

      logger.Log(
        globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        `Mesaj gönderim işlemi bu kuyruk için başarıyla tamamlandi. 
        | USER [${this.queue.userId}] 
        | QUEUE [${this.queue._id.toString()}] | SESSION [${
          this.userProps.session
        }]`
      );
    }
    //# =============================================================================
    //# Close connection after completed
    //# =============================================================================
    if (this.queueCompletedState !== QUEUE_STATUS.IN_PROGRESS)
      closeSocket(this.socket, parentPort);
  }
  /**********************************************
   * Fonksiyon: SendDataToReceiver
   * Açıklama: Kullaniciya mesaj gonderme islemini
   * yapan ana fonksyion
   * Girdi(ler): queueItem, currentReceiver
   * Çıktı: NULL
   **********************************************/
  async SendDataToReceiver(queueItem, currentReceiver) {
    let message = generateTextMessageForWP(queueItem, this.queue.queueMessage);
    const settings = this.userProps.settings;
    if (RuleChecker.checkeSpamCodeSettings(settings)) {
      message = message + generateUniqueCode();
    }
    //# =============================================================================
    //# Defining strategy and run proccess for this strategy
    //# =============================================================================
    switch (this.strategy) {
      case MESSAGE_STRATEGY.JUST_TEXT: { //OK 1 credit
        //# =============================================================================
        //# Send single message
        //# =============================================================================
        await sendMessage(this.socket, currentReceiver, message);
        break;
      }
      case MESSAGE_STRATEGY.JUST_FILE: { // OK 1 credit
        //# =============================================================================
        //# Send single file
        //# =============================================================================
        const extension = getFileType(this.files[0].name);
        const file_type = isMedia(extension);
        const fullFilePath = `${
          globalConfig.baseRootPath
        }${this.queue._id.toString()}/${this.files[0].name}`;
        const fileNName =
          fullFilePath.split("/")[fullFilePath.split("/").length - 1];
        if (file_type === FILE_TYPE.MEDIA)
          await sendMedia(
            this.socket,
            currentReceiver,
            fullFilePath,
            extension
          );
        else {
          await sendFile(this.socket, currentReceiver, fullFilePath, extension);
        }
        break;
      }
      case MESSAGE_STRATEGY.MULTIPLE_FILE: {
        //# =============================================================================
        //# Send multiple file
        //# =============================================================================
        this.files.map(async (file) => {
          const extension = getFileType(file.name);
          const file_type = isMedia(extension);
          const fullFilePath = `${
            globalConfig.baseRootPath
          }${this.queue._id.toString()}/${file.name}`;
          if (file_type === FILE_TYPE.MEDIA)
            await sendMedia(
              this.socket,
              currentReceiver,
              fullFilePath,
              extension
            );
          else {
            await sendFile(
              this.socket,
              currentReceiver,
              fullFilePath,
              extension
            );
          }
        });
        break;
      }
      case MESSAGE_STRATEGY.MULTIPLE_FILE_MESSAGE: {
        //# =============================================================================
        //# Send multiple file and message
        //# =============================================================================
        this.files.map(async (file) => {
          const extension = getFileType(file.name);
          const file_type = isMedia(extension);
          const fullFilePath = `${
            globalConfig.baseRootPath
          }${this.queue._id.toString()}/${file.name}`;
          if (file_type === FILE_TYPE.MEDIA)
            await sendMedia(
              this.socket,
              currentReceiver,
              fullFilePath,
              extension
            );
          else {
            await sendFile(
              this.socket,
              currentReceiver,
              fullFilePath,
              extension
            );
          }
        });

        await sendMessage(this.socket, currentReceiver, message);
        break;
      }
      case MESSAGE_STRATEGY.ONE_FILE_MESSAGE: {
        //# =============================================================================
        //# Send single file and single message
        //# =============================================================================
        const extension = getFileType(this.files[0].name);
        const file_type = isMedia(extension);
        const fullFilePath = `${
          globalConfig.baseRootPath
        }${this.queue._id.toString()}/${this.files[0].name}`;
        if (file_type === FILE_TYPE.FILE) {
          await sendFile(this.socket, currentReceiver, fullFilePath, extension);
          await sendMessage(this.socket, currentReceiver, message);
        } else {
          await sendMediaAndContentMessage(
            this.socket,
            currentReceiver,
            fullFilePath,
            extension,
            message
          );
        }
        break;
      }
    }
    //# =============================================================================
    //# Delay before sending next receiver
    //# =============================================================================
    await delayForProcess(settings);
  }
  /**********************************************
   * Fonksiyon: AnalysisReceiverDataAndSave
   * Açıklama: Gecmis datasi ve gonderimden sonra
   *   -  kredi guncelleme islemlerinin yapilmasi icin analiz
   *   -   fonksiyonu
   * Girdi(ler): mergedData, queueItem
   * Çıktı: NULL
   **********************************************/
  async AnalysisReceiverDataAndSave(mergedData, queueItem) {
    let spendCount = 0;
    let extendedMessagesForCustomers = [];
    if (mergedData && mergedData.length > 0) {
      mergedData.map((mergedItem) => {
        if (mergedItem) {
          if (mergedItem.remoteJid === `${queueItem.phone}${this.baseIdName}`) {
            //# =============================================================================
            //# Defining send status by mergedItem
            //# =============================================================================
            let historyResult = defineStatusAndInfoFromHistoryData(mergedItem);
            let keys = "";
            if (mergedItem.message) keys = Object.keys(mergedItem.message)[0];
            extendedMessagesForCustomers = generateExtendedMessages(
              extendedMessagesForCustomers,
              new Date(mergedItem.sendAt.low * 1000),
              keys,
              historyResult.status
            );
            spendCount += historyResult.spendCount;
          }
        }
      });
    } else {
      //# =============================================================================
      //# Setting history data
      //# =============================================================================
      logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.consoleAndFile,
        `GEÇMİŞ DATASI BULUNMUYOR | UYARI | MÜŞTERİNİN INTERNET BAĞLANTISI YOK.`
      );
      spendCount += 1;
      extendedMessagesForCustomers = generateExtendedMessages(
        extendedMessagesForCustomers,
        new Date(),
        "",
        "Gönderildi. (Başarılı)"
      );
    }
    logger.Log(
      globalConfig.LogTypes.info,
      globalConfig.LogLocations.consoleAndFile,
      `Müşteri bilgileri için veri işleniyor. |
        Kullanıcı => ${
          this.queue.userId
        } | Kuyruk => ${this.queue._id.toString()} | o andaki müşteri => ${queueItem._id.toString()}`
    );
    //# =============================================================================
    //# Update queueItem for history data
    //# =============================================================================
    this.spendCountPerItem =
      this.spendCountPerItem !== spendCount && spendCount > 0
        ? spendCount
        : this.spendCountPerItem;
    //queueItem.spendCredit = (spendCount && spendCount > 0) ? spendCount : this.spendCountPerItem; spending credit per item length
    queueItem.spendCredit = spendCount > 0 ? 1 : 0; // spending per user
    queueItem.message_status = extendedMessagesForCustomers;
    await queueItemModel.updateOne(
      { _id: new mongoose.Types.ObjectId(queueItem._id) },
      { $set: queueItem }
    );
    //# =============================================================================
    //# Decerease credit from user and set new transaction as spent type
    //# =============================================================================
    if (spendCount > 0) {
      this.userProps.credit.totalAmount -= 1;
      await creditsModel.updateOne(
        { _id: new mongoose.Types.ObjectId(this.userProps.credit._id) },
        { $set: this.userProps.credit }
      );
      await creditTransactionModel.create({
        user_id: this.userProps.credit.userId.toString(),
        amount: 1, //spending per user
        //amount: (spendCount && spendCount > 0) ? spendCount : this.spendCountPerItem,
        transaction_date: new Date(Date.now()),
        transaction_type: "spent",
      });
      logger.Log(
        globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        `Kredi hareket işlemi gerçekleştirildi. | ${this.queue.userId}`
      );
    }
    return queueItem;
  }
}
module.exports = { MessageController };
