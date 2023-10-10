const schedule = require("node-schedule");
const {logger} = require('./Utils/logger');
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

const { quequeSchema, quequeModel } = require("./model/queque.types");
const mongoose = require("mongoose");
const {globalConfig} = require('./model/config');
const runScript = async() => {
  try {
    console.log("running");
    

    if (isMainThread) {
      await mongoose.connect(globalConfig.mongo_url);
      const currentDate = new Date("2023-10-08T13:40:40.498+00:00");
      const quequeList = await quequeModel.find({ startDate: currentDate });

      if (quequeList.length > 0) {
        for (const queque of quequeList) {
          const worker = new Worker("./quequeManagement/quequeController.js", {
            workerData: { queque: JSON.stringify(queque) },
          });

          worker.postMessage('start');
        }
      } else {
        logger.Log(
          globalConfig.LogTypes.info,
          globalConfig.LogLocations.consoleAndFile,
          "There is no queque for this Date"
        );
      }
    }
  } catch (error) {
    console.error("MongoDB bağlantı hatası veya işlem hatası:", error);
  }
} 
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB bağlantısı kapatıldı.');
    process.exit(0);
  });
});

runScript();
// schedule.scheduleJob("*/1 * * * *", async function () {
//   runScript();
// });

// 10 dakikada bir queque sorgusu atacak. (şuan ki saat üzerinden bir sorgu atacak.)
// olan quequeleri için önce eklenmesi gereken bir dosya var mı onun kontrolünü yapacak.
// root path'i alarak arama yaptıracak.
// alınan bütün dosyaları okuyacak. (max 5 adet)
// daha sonra bütün queque üyelerini çekecek. (quequeItem)
// user'ın delay time'ina erişip işlem yaptırtacak. araya bir delay koyması gerekli.
// mesajları tek tek gönderdikten sonra user'credit düşüşü yapacak.
// bu sırada sürekli client authenticated kontrolü yapacak. (wp üzerinden)
