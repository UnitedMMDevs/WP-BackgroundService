/***********************************************************************
 *  İŞLEV: Servis calisma mantigi icin gerekli olan kucuk yardimci fonksiyonlari barindiran dosya
 *  AÇIKLAMA:
 *      Yardimci fonksiyonlari sistemin isleyisini kolaytiracak
 *      -   fonksiyonlari barindirip sistemde kod tekrarni onleyen kisim
 ***********************************************************************/


//# =============================================================================
//# Lib imports
//# =============================================================================
const path = require('path');
const { globalConfig } = require('./config');
const { FILE_TYPE } = require('./wp-utilities');
const fs = require("fs")

 /**********************************************
 * Fonksiyon: getRandomDelay
 * Açıklama: Sistemde bekleme anlarinda random bir bekleme zamani icin
 *  -   yazilan bir fonksiyon
 * Girdi(ler): min, max
 * Çıktı: number
 **********************************************/
const getRandomDelay = (min, max) => {
    return Math.random() * (max - min) + min;
}

 /**********************************************
 * Fonksiyon: defineStatusCheckDelay
 * Açıklama: Sistemde gonderim zamaninda kisi bazli kuyruk durum kontrolu
 *  -   icin yazilan bir fonksiyon
 *  -   burada belirli kullanici araliklari ile kuyruk durumunun kontrolu icin
 *  -   yazilmis yardimci fonksiyon
 * Girdi(ler): totalItemCount
 * Çıktı: number
 **********************************************/
const defineStatusCheckDelay = (totalItemCount) =>
{
    if (totalItemCount < 10)
    {
        return 1;
    }
    else if (totalItemCount < 50)
    {
        return 2;
    }
    else if(totalItemCount < 100)
    {
        return 5;
    }
    else if(totalItemCount > 100 && totalItemCount < 600)
    {
        return 10;
    }
    else if (totalItemCount >= 600)
    {
        return 20;
    }
}

 /**********************************************
 * Fonksiyon: deleteFolderRecursive
 * Açıklama: Dosya islemlerinde bulunan klasoru
 *  -   silmeden once icerisindeki butun dosyalari
 *  -   kaldirip daha sonra klasorun kendisini silen
 *  -   yardimci fonksiyon
 * Girdi(ler): directoryPath
 * Çıktı: NULL
 **********************************************/
const deleteFolderRecursive = (directoryPath) => {
    //# =============================================================================
    //# Check directory exists
    //# =============================================================================
    if (fs.existsSync(directoryPath)) {
        //# =============================================================================
        //# Reading all files inside of directory
        //# =============================================================================

      fs.readdirSync(directoryPath).forEach((file) => {
        const curPath = path.join(directoryPath, file);
        //# =============================================================================
        //# Checking the item file or directory
        //# =============================================================================

        if (fs.lstatSync(curPath).isDirectory()) {
        //# =============================================================================
        //# if item is directory execute self again to going deep and react files and delete it
        //# =============================================================================
          deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(directoryPath);
    }
}
 /**********************************************
 * Fonksiyon: getFileType
 * Açıklama: Dosya uzantisini almak icin kullanilan
 *  -   yardimci fonksiyon
 * Girdi(ler): file_name
 * Çıktı: string
 **********************************************/
const getFileType = (file_name) => {
    const extension = path.extname(file_name).toLowerCase();
    return extension;
}
 /**********************************************
 * Fonksiyon: generateTextMessageForWP
 * Açıklama: Bu fonksiyon gonderilmesi gereken mesaji db deki verilere 
 *  -   gore sekillendirir.
 *  -   yardimci fonksiyon
 * Girdi(ler): queueItem db model, message string
 * Çıktı: string
 **********************************************/
const generateTextMessageForWP = (queueItem, message) => {
    //# =============================================================================
    //# Setting dynamic data from queueMessage 
    //# =============================================================================
    if (queueItem.name !== "" && message.includes("[isim]"))
      message = message.replace("[isim]", queueItem.name)
    if (queueItem.info1 !=="" && message.includes("[bilgi1]"))
      message = message.replace("[bilgi1]", queueItem.info1)
    if (queueItem.info2 !=="" && message.includes("[bilgi2]"))
      message = message.replace("[bilgi2]", queueItem.info2)
    if (queueItem.info3 !== "" && message.includes("[bilgi3]"))
      message = message.replace("[bilgi3]", queueItem.info3)

    return message;
}
module.exports =  { 
    getRandomDelay, 
    defineStatusCheckDelay,  
    getFileType, 
    deleteFolderRecursive,
    generateTextMessageForWP
    
}; 