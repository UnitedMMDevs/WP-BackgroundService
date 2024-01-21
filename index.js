const schedule = require("node-schedule");
const { logger } = require('./Utils/logger');
const {
  Worker,
  isMainThread,
} = require("worker_threads");

const { queueSchema, queueModel, QUEUE_STATUS } = require("./model/queue.types");
const mongoose = require("mongoose");
const { globalConfig } = require("./Utils/config");

const runScript = async () => {
  try {
    if (isMainThread) {
      logger.Log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        "Servis aktif kuyrukları aramaya başladı.");
      
      const currentDate = new Date();
      const currentHour = currentDate.getHours();
      const currentMinute = currentDate.getMinutes();

      const queueList = await queueModel.find({
        startDate: {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour, currentMinute),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour, currentMinute + 1)
        },
        status: QUEUE_STATUS.PENDING
      });
      if (queueList.length > 0) {
        for (let queue of queueList) {
          //adding workers for each queue inside of the queue list
          queue.status = QUEUE_STATUS.IN_PROGRESS;
          const updatedQueue = await queueModel.updateOne(
            {_id: queue._id.toString()},
              {$set:queue}
          );
          const worker = new Worker("./queueManagement/queueController.js", {
            workerData: { queue: JSON.stringify(queue) },
          });
          worker.postMessage('start');
          console.log(`THREAD ID: ${worker.threadId}`);
        }
      } else {
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          `Bu zaman diliminde aktif kuyruk bulunmuyor. => [${currentDate}]`
        );
      }
    }
  } catch (error) {
    console.log(error);
    logger.Log(globalConfig.LogTypes.error, globalConfig.LogLocations.all, "Veri tabanı bağlantı hatası. [CRITICAL]", error);
  }
}
process.on('SIGINT', async() => {
  await mongoose.connection.close(false);
  logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.console, 'Veri tabanı bağlatısı kapatıldı.');
  process.exit(0);
});
mongoose.connect(globalConfig.mongo_url).then(async(result) => {
  logger.Log(
    globalConfig.LogTypes.info,
    globalConfig.LogLocations.consoleAndFile,

    `Veri tabanına bağlandı.`
  );
}).then();
schedule.scheduleJob("*/1 * * * *", async function() {
  await runScript();
});

