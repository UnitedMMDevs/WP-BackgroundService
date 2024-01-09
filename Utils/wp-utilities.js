const fs = require("fs")
const { MessageType, MessageOptions, Mimetype, Browsers } = require('@whiskeysockets/baileys')
const { globalConfig } = require("./config");

// generating socket options

const { wpSessionCollection } = require("../model/wpSession.types")

const generateSocketOptions = (state) => {
  const options = {
    printQRInTerminal: false,
    auth: state,
    receivedPendingNotifications: true,
    defaultQueryTimeoutMs: undefined,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    browser: Browsers.ubuntu("Desktop"),
  };
  return options;
}

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
  console.log(media)
  console.log(file_type)
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
module.exports = {
  generateSocketOptions,
  closeSocket, 
  sendMedia, 
  sendMediaAndContentMessage, 
  sendMessage, 
  checkAuthentication,
  sendFile,
  FILE_TYPE,
  MESSAGE_STATUS,
  MESSAGE_STRATEGY
}



