const { Browsers } = require("@whiskeysockets/baileys");
const { globalConfig } = require("../model/config");
const { wpSessionCollection } = require("../model/wpSession.types");

// generating socket options
const generateSocketOptions = (state) => {
  const options = {
    printQRInTerminal: false,
    auth: state,
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

const sendFile = async(socket, receiver, file) => {
    await socket.sendMessage(receiver, {
      image: { url: file },
    });
}
const sendMediaAndContentMessage = async (socket, receiver, media, message) => {
  // will code
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

module.exports = {
  generateSocketOptions,
  closeSocket, 
  sendFile, 
  sendMediaAndContentMessage, 
  sendMessage, 
  checkAuthentication,
}



