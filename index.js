const schedule = require("node-schedule");
const { logger } = require('./Utils/logger');
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

const { quequeSchema, quequeModel, QUEUE_STATUS } = require("./model/queque.types");
const mongoose = require("mongoose");
const { globalConfig } = require('./model/config');
const runScript = async () => {
  try {
    if (isMainThread) {
      logger.Log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        "Service Started for searching active queque");
      await mongoose.connect(globalConfig.mongo_url).then(async(result) => {
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,

          `Connected To the Database`
        );
      });
      const currentDate = new Date();
      const currentHour = currentDatet.getHours();
      const currentMinute = currentDae.getMinutes();

      const quequeList = await quequeModel.find({
        startDate: {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour, currentMinute),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour, currentMinute + 1)
        },
        status: QUEUE_STATUS.PENDING
      });
      if (quequeList.length > 0) {
        for (let queque of quequeList) {
          //adding workers for each queque inside of the queque list
          queque.status = QUEUE_STATUS.IN_PROGRESS;
          const updatedQueue = await quequeModel.updateOne(
            {_id: queque._id.toString()},
            {$set: queque}  
          );
          const worker = new Worker("./quequeManagement/quequeController.js", {
            workerData: { queque: JSON.stringify(updatedQueue) },
          });
          worker.postMessage('start');
          console.log(`THREAD ID: ${worker.threadId}`);
        }
      } else {
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          `There is no queque for this Date => [${currentDate}]`
        );
      }
    }
  } catch (error) {
    logger.Log(globalConfig.LogTypes.error, globalConfig.LogLocations.all, "Database Connection Error [CRITICAL]", error);
  }
}
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.console, 'Database connection has been closed.');
    process.exit(0);
  });
});

schedule.scheduleJob("*/1 * * * *", async function() {
  await runScript();
});


