/***********************************************************************
 *  İŞLEV: Whatsapp tarafinda baglanti, gonderim ve analiz icin gerekli yardim araclari 
 *  AÇIKLAMA:
 *      Whatsapp baglantisi esnasinda
 *      - ise yarayacak ve analiz beslemesini saglayacak yardimci fonksiyonlari barindirir.
 ***********************************************************************/


//# =============================================================================
//# Lib imports
//# =============================================================================
const fs = require("fs")
const { MessageType, MessageOptions, Mimetype, Browsers, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { globalConfig } = require("./config");
const { wpSessionCollection } = require("../model/wpSession.types");
const { delayThread, getRandomDelay } = require("./utilties");
const { generateUniqueCode } = require("./generateUniqueCode");
const logger = require("./logger");


 /**********************************************
 * Fonksiyon: generateSocketOptions
 * Açıklama: Whatsapp baglantisi icin gerekli web-socket 
 *  - ayarlarini olusturan fonksiyon
 * Girdi(ler): state
 * Çıktı: {
    printQRInTerminal: false,
    auth: state,
    defaultQueryTimeoutMs: undefined,
    receivedPendingNotifications: true,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    keepAliveIntervalMs: 1000,
    connectTimeoutMs: 15000,
    browser: Browsers.ubuntu("Desktop"),
  }
 **********************************************/
const generateSocketOptions = (state) => {
  const socketOpt ={
    printQRInTerminal: false,
    auth: state,
    defaultQueryTimeoutMs: undefined,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    keepAliveIntervalMs: 1000,
    connectTimeoutMs: 15000,
    browser: Browsers.ubuntu("Desktop"),
  }
  return socketOpt;
}
//# =============================================================================
//# MESSAGE SENT STATUS
//# =============================================================================
const MESSAGE_STATUS = {
  DELIVERY_ACK: 3, // teslimat onayi
  ERROR: 0, // hata
  PENDING: 1, // bekleniyor
  PLAYED: 5, // oynatildi
  READ: 4, // okundu
  SERVER_ACK: 2 // 
}
//# =============================================================================
//# MESSAGE STRATEGY
//# =============================================================================
const MESSAGE_STRATEGY = {
  JUST_TEXT: 0, // 1 credit
  JUST_FILE: 1,
  MULTIPLE_FILE: 2,
  MULTIPLE_FILE_MESSAGE: 3,
  ONE_FILE_MESSAGE: 4
}
//# =============================================================================
//# FILE TYPE
//# =============================================================================
const FILE_TYPE = {
  MEDIA: 0,
  FILE: 1
}

 /**********************************************
 * Fonksiyon: isMedia
 * Açıklama: Dosya uzantisi uzerinden belirledigimiz
 *  - bazi medya uzantilarina gore gonderilmek istenen
 *  - dosyanin media olup olmadigini kontrol eden fonksiyon.
 * Girdi(ler): extension
 * Çıktı: BOOLEAN
 **********************************************/
const isMedia = (extension) => {
  const isMediaCondition = (extension === ".jpg" | extension === ".png" ||  extension === ".jpeg" || extension === ".mp4")
  return isMediaCondition ? FILE_TYPE.MEDIA : FILE_TYPE.FILE
}

 /**********************************************
 * Fonksiyon: defineStrategy
 * Açıklama: Kuyruk icerigine gore
 *  - starteji tanimlamasi yapan ve ona gore gonderimi
 *  - sekillendiren yardimci fonksiyon
 * Girdi(ler): message, files
 * Çıktı: MESSAGE_STRATEGY
 **********************************************/
const defineStrategy = (message, files) => {
  const hasMessage = !(!message && message !== "undefined");
  const hasFiles = files && files.length > 0;
  if (hasMessage && !hasFiles) return MESSAGE_STRATEGY.JUST_TEXT;
  if (!hasMessage && hasFiles) {
      return files.length === 1 ? MESSAGE_STRATEGY.JUST_FILE : MESSAGE_STRATEGY.MULTIPLE_FILE;
  }
  if (hasMessage && hasFiles) {
      return files.length === 1 ? MESSAGE_STRATEGY.ONE_FILE_MESSAGE : MESSAGE_STRATEGY.MULTIPLE_FILE_MESSAGE;
  }

  // Handle unexpected case
  throw new Error("Invalid strategy conditions");
};

 /**********************************************
 * Fonksiyon: checkAuthentication
 * Açıklama: Mesaj gonderimine baslamadan once
 *  - bizim sistemimizde kullanicinin whatsapp
 *  - oturumunun kayitli olup olmadigini kontrol
 *  - eden yardimci fonksiyon.
 * Girdi(ler): logger, controller, session
 * Çıktı: { state, saveCreds }
 **********************************************/
const checkAuthentication = async(logger, controller, session) => {
  //# =============================================================================
  //# Check session exists from database
  //# =============================================================================
  if (session) {
    const { state, saveCreds } = await controller.useMongoDBAuthState(
      wpSessionCollection
    );
    //# =============================================================================
    //# If there is not exists than throw error 
    //# =============================================================================
    if (!state) {
      logger.Log(
        globalConfig.LogTypes.error,
        globalConfig.LogLocations.all,
        "Session Error"
      );
      return null;
    } else return { state, saveCreds };
  } else {
    //# =============================================================================
    //# If there is not exists than throw error 
    //# =============================================================================
    logger.Log(
      globalConfig.LogTypes.error,
      globalConfig.LogLocations.all,
      "Session Error"
    );
    return null;
  }
}
 /**********************************************
 * Fonksiyon: sendMessage
 * Açıklama: sadece text mesaji gonderimi yapan
 * -  yardimci fonksiyon
 * Girdi(ler): socket, receiver, message
 * Çıktı: NULL
 **********************************************/
const sendMessage = async (socket, receiver, message) => {
  // return success or fail
  const buttonMessage = {
    text: message,
    footer: "Pro WhatsApp Web",
    headerType: 1,
  };
  await socket.sendMessage(receiver, buttonMessage);
}
 /**********************************************
 * Fonksiyon: sendMedia
 * Açıklama: sadece media dosyasi gonderimi yapan
 * -  yardimci fonksiyon
 * Girdi(ler): socket, receiver, file, file_type
 * Çıktı: NULL
 **********************************************/
const sendMedia = async(socket, receiver, file, file_type) => {
  if(file_type === ".jpg" || file_type === ".png" || file_type === ".jpeg")
  {
    //# =============================================================================
    //# If media file is an image then set the config as picture and send send to receiver
    //# =============================================================================
  
    await socket.sendMessage(receiver, {image: {url: file}, caption: ""})
  }
  
  else if(file_type === ".mp4")
  {
    //# =============================================================================
    //# If media file is an video then set the config as video and send to receiver 
    //# =============================================================================
  
    const params = {
      video: {stream: fs.createReadStream(file)},
      mimetype: 'video/mp4',
    }
    await socket.sendMessage(receiver, params) 
  }
}

 /**********************************************
 * Fonksiyon: sendFile
 * Açıklama: sadece file gonderimi yapan
 * -  yardimci fonksiyon
 * Girdi(ler): socket, receiver, file, file_type
 * Çıktı: NULL
 **********************************************/
const sendFile = async (socket, receiver, file, file_type) => {
  if(file_type === ".mp3")
  {
    //# =============================================================================
    //# If  file is an voice file then set the config as voice and send to receiver 
    //# =============================================================================
    await socket.sendMessage(
      receiver, 
      { audio: { url: file }, mimetype: 'audio/mp4' },
    )
  }
  else if (file_type === ".ogg")
  {
    //# =============================================================================
    //# If  file is an voice file then set the config as voice and send to receiver 
    //# =============================================================================
    await socket.sendMessage(
      receiver, 
      { audio: { url: file }, mimetype: 'audio/mp4' },
    )
  }
  else if(file_type === ".waptt")
  {
    //# =============================================================================
    //# If  file is an voice file then set the config as voice and send to receiver 
    //# =============================================================================
    await socket.sendMessage(
      receiver, 
      { audio: { url: file }, mimetype: 'audio/mp4' },
    )
  }
  else
  {
    //# =============================================================================
    //# If  file is an document file then set the config as document and send to receiver 
    //# =============================================================================
    await socket.sendMessage(
      receiver,
      {document: { url: file, caption:""}},
    )
  }
}
 /**********************************************
 * Fonksiyon: sendMediaAndContentMessage
 * Açıklama: Media dosyasi ve text messagi ayni anda
 * -  gonderen yardimci fonksiyon
 * Girdi(ler): socket, receiver, media, file_type, message
 * Çıktı: NULL
 **********************************************/
const sendMediaAndContentMessage = async (socket, receiver, media, file_type, message) => {

  if(file_type === ".jpg" || file_type === ".png" || file_type === ".jpeg")
  {
    await socket.sendMessage(receiver, {image: {url: media}, caption: message})
  }
  else if(file_type === ".mp4")
  {
    const params = {
      video: {stream: fs.createReadStream(media)},
      mimetype: 'video/mp4',
      caption: message
    }
    await socket.sendMessage(receiver, params) 
  }
}

 /**********************************************
 * Fonksiyon: closeSocket
 * Açıklama: Whatsapp baglantisini kopartan yardimci
 *  - fonksyion
 * Girdi(ler): socket, parentPort
 * Çıktı: NULL
 **********************************************/
const closeSocket = (socket, parentPort) => {
  socket.end(undefined);
  parentPort.postMessage('terminate');
}
 /**********************************************
 * Fonksiyon: checkReceiverExists
 * Açıklama: Mesaj gonderilmek istenen Whatsapp kullanicinin
 *  -  gercek olup olmadigini kontrol eden yardimci
 *  -  fonksiyon
 * Girdi(ler): socket, parentPort
 * Çıktı: NULL
 **********************************************/
const checkReceiverExists = async(socket, receiver)=>{
  const [result] = await socket.onWhatsApp(receiver);
  if(result?.exists) return true;
  return false;
}

const delayForProcess = async(settings) => {
  const delaySeconds = getRandomDelay(settings.min_message_delay, settings.max_message_delay) 
  logger.logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, `||||||||WAIT FOR ${delaySeconds}||||||||`)
  await delay((delaySeconds === 0 ? 2 : delaySeconds) * 1000)
  setTimeout(() => {
  },  (delaySeconds === 0 ? 2 : delaySeconds) * 1000);
}
const delayForProcessOverride = async(delayAmount) => {
  logger.logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, `||||||||WAIT FOR ${delayAmount}||||||||`)
  await delay((delayAmount) * 1000)
  setTimeout(() => {
  }, (delayAmount) * 1000);
}
module.exports = {
  MESSAGE_STATUS,
  FILE_TYPE,
  MESSAGE_STRATEGY,
  generateSocketOptions,
  closeSocket, 
  sendMedia, 
  sendMediaAndContentMessage, 
  sendMessage,
  defineStrategy, 
  checkAuthentication,
  sendFile,
  isMedia,
  checkReceiverExists,
  delayForProcess,
  delayForProcessOverride
}



