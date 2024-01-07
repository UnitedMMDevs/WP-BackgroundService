const { globalConfig } = require("../model/config");
const { wpSessionCollection } = require("../model/wpSession.types");

const sendFile = async(socket, customer, files, queue) => {
    files.map(async (file) => {
      const fullFilePath = `${globalConfig.baseRootPath
        }${queue._id.toString()}/${file}`;
      await socket.sendMessage(customer, {
        image: { url: fullFilePath },
      });
    });
  }

const sendMediaAndMessage = async (socket, customer, queue) => {

}
const sendMessage = async (socket, customer, queue) => {
    // return success or fail
    const buttonMessage = {
      text:queue.quequeMessage,
      footer: "Pro WhatsApp Web",
      headerType: 1,
    };
    await socket.sendMessage(customer, buttonMessage);
  }

const sendFileAndMessage = async(socket, customer, files, queue) => {
    await sendFile(socket, customer, files, queue);
    await sendMessage(socket, customer, queue);
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

const handleMessageUpdates = async(updates, itemModel, queueModel, transactionModel, logger) => {
  
}
const closeSocket = (socket, parentPort) => {
    socket.end(undefined);
    parentPort.postMessage('terminate');
}
module.exports = {closeSocket, sendFile, sendFileAndMessage, sendMessage, checkAuthentication, sendMediaAndMessage}