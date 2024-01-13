const fs = require("fs")
const { MessageType, MessageOptions, Mimetype, Browsers, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { globalConfig } = require("./config");


const { wpSessionCollection } = require("../model/wpSession.types");
const { delayThread } = require("./utilties");

const generateSocketOptions = (state) => {
  const socketOpt ={
    printQRInTerminal: false,
    auth: state,
    defaultQueryTimeoutMs: 1000,
    receivedPendingNotifications: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    keepAliveIntervalMs: 1000,
    browser: Browsers.ubuntu("Desktop"),
  }
  return socketOpt;
}
// generating socket options
const MESSAGE_STATUS = {
  DELIVERY_ACK: 3, // teslimat onayi
  ERROR: 0, // hata
  PENDING: 1, // bekleniyor
  PLAYED: 5, // oynatildi
  READ: 4, // okundu
  SERVER_ACK: 2 // 
}
const MESSAGE_STRATEGY = {
  JUST_TEXT: 0, // 1 credit
  JUST_FILE: 1,
  MULTIPLE_FILE: 2,
  MULTIPLE_FILE_MESSAGE: 3,
  ONE_FILE_MESSAGE: 4
}
const FILE_TYPE = {
  MEDIA: 0,
  FILE: 1
}
const isMedia = (extension) => {
  const isMediaCondition = (extension === ".jpg" | extension === ".png" ||  extension === ".jpeg" || extension === ".mp4")
  return isMediaCondition ? FILE_TYPE.MEDIA : FILE_TYPE.FILE
}
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

const checkAuthentication = async(logger, controller, session) => {
  if (session) {
    const { state, saveCreds } = await controller.useMongoDBAuthState(
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
const sendMessage = async (socket, receiver, message) => {
  // return success or fail
  const buttonMessage = {
    text: message,
    footer: "Pro WhatsApp Web",
    headerType: 1,
  };
  await socket.sendMessage(receiver, buttonMessage);
}

const sendMedia = async(socket, receiver, file, file_type) => {
  if(file_type === ".jpg" || file_type === ".png" || file_type === ".jpeg")
  {
    await socket.sendMessage(receiver, {image: {url: file}, caption: ""})
  }
  else if(file_type === ".mp4")
  {
    const params = {
      video: {stream: fs.createReadStream(file)},
      mimetype: 'video/mp4',
    }
    await socket.sendMessage(receiver, params) 
  }
}


const sendFile = async (socket, receiver, file, file_type) => {
  if(file_type === ".mp3")
  {
    await socket.sendMessage(
      receiver, 
      { audio: { url: file }, mimetype: 'audio/mp4' },
    )
  }
  else
  {
    await socket.sendMessage(
      receiver,
      {document: { url: file, caption:""}},
    )
  }
}
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


const closeSocket = (socket, parentPort) => {
  socket.end(undefined);
  parentPort.postMessage('terminate');
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
  isMedia
}



