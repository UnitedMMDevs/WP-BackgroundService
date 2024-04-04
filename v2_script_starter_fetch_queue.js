const { default: mongoose } = require("mongoose");
const { queueModel, QUEUE_STATUS } = require("./model/queue.types");
const { globalConfig } = require("./Utils/config");
const {logger} = require("./Utils/logger");

const fetchQueue = async() => {
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
        return queueList;
    }
    else {
        return [];
    }
}
mongoose.connect(globalConfig.mongo_url).then(async(result) => {
  }).then((mongoResult) => {
    fetchQueue().then((result) => {
        console.log(["test", "test1", "test2"])
    }).catch((err) => {
        console.log(err);
    });
    
  });


