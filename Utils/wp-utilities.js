const { globalConfig } = require("../model/config");

const sendFile = async(socket, customer, files, queue) => {
    files.map(async (file) => {
      const fullFilePath = `${globalConfig.baseRootPath
        }${queue._id.toString()}/${file}`;
      await socket.sendMessage(customer, {
        image: { url: fullFilePath },
      });
    });
    socket.cleanDirtyBits()
  }

const sendMessage = async (socket, customer) => {
    // return success or fail
    const buttonMessage = {
      text:
        this.dependencies.queue.quequeTitle +
        "\n" +
        this.dependencies.queue.quequeMessage,
      footer: "Pro WhatsApp Web",
      headerType: 1,
    };
    await socket.sendMessage(customer, buttonMessage);
    socket.cleanDirtyBits()
  }

const sendFileAndMessage = async(socket, customer, files, queue) => {
    await sendFile(socket, customer, files, queue);
    await sendMessage(socket, customer);
  }
const closeSocket = (socket, parentPort) => {
    socket.end();
    parentPort.postMessage('terminate');
}

module.exports = {closeSocket, sendFile, sendFileAndMessage, sendMessage}