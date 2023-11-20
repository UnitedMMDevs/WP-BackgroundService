const schedule = require("node-schedule");
const { logger } = require('./Utils/logger');
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

const { quequeSchema, quequeModel } = require("./model/queque.types");
const mongoose = require("mongoose");
const { globalConfig } = require('./model/config');
const runScript = async () => {
  try {
    if (isMainThread) {
      logger.log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        "Service Started for searching active queque");
      await mongoose.connect(globalConfig.mongo_url);
      const currentDate = new Date("2023-10-08T13:40:40.498+00:00");
      const quequeList = await quequeModel.find({ startDate: currentDate });

      if (quequeList.length > 0) {
        for (const queque of quequeList) {
          //adding workers for each queque inside of the queque list
          const worker = new Worker("./quequeManagement/quequeController.js", {
            workerData: { queque: JSON.stringify(queque) },
          });
          // starting workers with opening new threads
          worker.postMessage('start');
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
    logger.log(globalConfig.LogTypes.error, globalConfig.LogLocations.all, "Database Connection Error [CRITICAL]", error);
  }
}
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.log(globalConfig.LogTypes.info, globalConfig.LogLocations.console, 'MongoDB bağlantısı kapatıldı.');
    process.exit(0);
  });
});

schedule.scheduleJob("*/10 * * * *", async function() {
  await runScript();
});

