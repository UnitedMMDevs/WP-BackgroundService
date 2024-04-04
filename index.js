/***********************************************************************
 *  İŞLEV: Ana Programin baslangic noktasi
 *  AÇIKLAMA:
 *      Bu js dosyasi ana programin calismasini saglayan mekanizmayi harekete gecirir
 *      - thread ayrimini yapabilmek icin burada main threadi hedef alir
 *      - main thread icerisinde aktif sistemde gonderilmesi gereken kuyruklara veri tabanindan bakar
 *      - her kuyruk icin ayri bir thread olusturarak islemleri oraya gonderir
 *      - sistem schedule edilerek her 1 dakika bir bu islemi tekrarlar
 ***********************************************************************/


//# =============================================================================
//# Kutuphane import islemleri 
//# =============================================================================
const schedule = require("node-schedule");
const { logger } = require('./Utils/logger');
const {
  Worker,
  isMainThread,
} = require("worker_threads");
const { queueSchema, queueModel, QUEUE_STATUS } = require("./model/queue.types");
const mongoose = require("mongoose");
const { globalConfig, baseBanner } = require("./Utils/config");


 /**********************************************
 * Fonksiyon: runScript
 * Açıklama: Her schedule zamaninda ana thread icerisinde aktif kuyruklari
 *  - bularak her birini birer threade yerlesitirip islemi tetikleyen ana fonksiyondur.
 * Girdi(ler): NULL
 * Çıktı: NULL
 **********************************************/
let activeWorkers = []
const runScript = async () => {
  try {
    //# =============================================================================
    //# Check main thread 
    //# =============================================================================
    if (isMainThread) {
      logger.Log(globalConfig.LogTypes.info,
        globalConfig.LogLocations.consoleAndFile,
        "Servis aktif kuyrukları aramaya başladı.");
      
      const currentDate = new Date();
      const currentHour = currentDate.getHours();
      const currentMinute = currentDate.getMinutes();
      //# =============================================================================
      //# fetch active queue for current hour and minute from database
      //# =============================================================================
      const queueList = await queueModel.find({
        startDate: {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour, currentMinute),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour, currentMinute + 1)
        },
        status: QUEUE_STATUS.PENDING
      });
      if (queueList.length > 0) {
        for (let queue of queueList) {
          //# =============================================================================
          //# Generate background worker for each active queue 
          //# =============================================================================
          const worker = new Worker("./queueManagement/queueController.js", {
            workerData: { queue: JSON.stringify(queue) },
          });
          worker.on("message", (message)=> {
            if(message === 'terminate') {
              logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.consoleAndFile, "Thread Sonlandiriliyor.");
              worker.terminate();
            }
          })
          worker.postMessage('start');
          activeWorkers.push(worker);
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
    //# =============================================================================
    //# Catching Database connection error!
    //# =============================================================================
    console.log(error);
    logger.Log(globalConfig.LogTypes.error, globalConfig.LogLocations.all, "Veri tabanı bağlantı hatası. [CRITICAL]", error);
  }
}

//# =============================================================================
//# Process begin event listener 
//# =============================================================================
process.on('SIGINT', async() => {
  await mongoose.connection.close(false);
  logger.Log(globalConfig.LogTypes.info, globalConfig.LogLocations.console, 'Veri tabanı bağlatısı kapatıldı.');
  process.exit(0);
});

process.on("message", (message)=> {
  if (message === "terminate") {
    console.log("||||||||||||||||||||||||||||||| WORKER MESSAGE TO MAIN PROCESS||||||||||||||||||||||")
    activeWorkers.forEach(element => {
      console.log(element.threadId);
    });
    console.log("||||||||||||||||||||||||||||||| WORKER MESSAGE TO MAIN PROCESS||||||||||||||||||||||")
  }
})
//# =============================================================================
//# Mongoose connection
//# =============================================================================
mongoose.connect(globalConfig.mongo_url).then(async(result) => {
  logger.Log(
    globalConfig.LogTypes.info,
    globalConfig.LogLocations.consoleAndFile,

    `Veri tabanına bağlandı.`
  );
}).then();


console.log(baseBanner)
 /**********************************************
 * Fonksiyon: scheduleJob
 * Açıklama: Sistemi bir dakika da bir tekrar calistirilmasini saglayan tetikleyici fonksiyon
 * Girdi(ler): async function
 * Çıktı: NULL
 **********************************************/
schedule.scheduleJob("*/1 * * * *", async function() {
  await runScript();
});

