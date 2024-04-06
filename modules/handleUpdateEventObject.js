/***********************************************************************
 *  İŞLEV: Bu js dosyasi kuyruk islemleri mesaj gecmisi olusturmak icin yardimci fonksiyon sunar. 
 *  AÇIKLAMA:
 *      Kuyruk islemleri sirasinda whatsapp uzerinden yakalanan bilgilendirme datalarini islemek ve 
 *      - kuyruk icin gecmis datasi olusturabilmek icin olusturulmus yardimci fonksiyonlari barindirir.
 ***********************************************************************/

const { MESSAGE_STATUS } = require("../Utils/wp-utilities")



 /**********************************************
 * Fonksiyon: seperateDataFromUpdate
 * Açıklama: Whatsapp update eventi sonrasinda mesaj gonderim bildirimini yakalar ve icerisinden 
 *  -  gonderen kisinin bilgisini
 *  -  bildirim idsini
 *  -  kullanicinin kendisinin gonderim yapip yapmadiginin bilgisini
 *  -  gonderim durumunu iceriden alir.
 * Girdi(ler): update data
 * Çıktı: []
 **********************************************/
const seperateDataFromUpdate = (update) => {
    let seperatedArray = []
    update.forEach((obj) => {
        if(obj.key.fromMe === true){
            const seperatedData = {
                remoteJid: obj.key.remoteJid,
                id: obj.key.id,
                fromMe: obj.key.fromMe,
                status: obj.update.status
            }
            seperatedArray.push(seperatedData)
        }
    })
    return seperatedArray;
}

 /**********************************************
 * Fonksiyon: seperateDataFromUpsert
 * Açıklama: Whatsapp update eventi sonrasinda mesaj gonderim bildirimini yakalar ve icerisinden 
 *  -  gonderen kisinin bilgisini
 *  -  gonderilen mesaj icerigini
 *  -  mesaj id sini
 *  -  gonderim zamanini alir.
 * Girdi(ler): update data
 * Çıktı: []
 **********************************************/
const seperateDataFromUpsert = (upsert) => {
    let seperatedArray = [];
    const message = upsert.messages[0];
    if (message.key.fromMe === true) {
        const seperatedData = {
            remoteJid: message.key.remoteJid,
            fromMe: message.key.fromMe,
            id: message.key.id,
            message: message.message,
            sendAt: message.messageTimestamp,
        };
        seperatedArray.push(seperatedData);
    }
    return seperatedArray;
};

 /**********************************************
 * Fonksiyon: mergeUpsertUpdateData
 * Açıklama: update ve upsert islemlerinden elde edilen dizileri id bilgilerine gore eslestirip 
 *  -  kuyruk olusturan kisiye gecmis datasinin gosterilebilmesi icin
 *  -  data yigini olusturur
 * Girdi(ler): updateData, upsertData
 * Çıktı: []
 **********************************************/
const mergeUpsertUpdateData = (upsertData, updateData) => {
    let mergedData = [];
    upsertData.forEach((upsertItem) => {
        const matchingUpdate = updateData.find((updateItem) => updateItem.id === upsertItem.id);
        if (matchingUpdate) {
            const mergedItem = {
                remoteJid: upsertItem.remoteJid,
                fromMe: upsertItem.fromMe,
                id: upsertItem.id,
                message: upsertItem.message,
                sendAt: upsertItem.sendAt,
                status: matchingUpdate.status,
            };
            mergedData.push(mergedItem);
        }
    });

    return mergedData;
};
 /**********************************************
 * Fonksiyon: generateExtendedMessages
 * Açıklama: Bu fonksiyon mesaj gonderimi yapilan kullanicilarin gecmis
 *  -   datasini generate etmek icin kullaniliyor
 * Girdi(ler): updateData, upsertData
 * Çıktı: []
 **********************************************/
const generateExtendedMessages = (messages, sentAt, message, status) => {
    messages.push({ sent_at: sentAt, message: message, status: status });
    return messages;
};

const defineStatusAndInfoFromHistoryData = (mergedItem) => {
    let status = "";
    let spendCount = 0;
    switch(mergedItem.status) 
    {
        case MESSAGE_STATUS.ERROR: {
            spendCount = 0;
            status = "Gönderilemedi. (Başarısız)"
            break;
        }
        case MESSAGE_STATUS.DELIVERY_ACK : {
            spendCount += 1
            status = "İletildi. (Başarılı)"

            break;
        }
        case MESSAGE_STATUS.PENDING: {
            spendCount += 1
            status = "Bekliyor.(Başarılı)"
            break;
        }
        case MESSAGE_STATUS.PLAYED : {
            spendCount += 1
            status = "İzlendi. (Başarılı)"
            break;
        }
        case MESSAGE_STATUS.READ : {
            spendCount += 1
            status = "Okundu. (Başarılı)"

            break;
        }
        case MESSAGE_STATUS.SERVER_ACK : {
            spendCount += 1
            status = "İletildi. (Başarılı)"
            break;
        }
    }
    return {spendCount, status};
}
module.exports = {
    seperateDataFromUpdate,
    seperateDataFromUpsert,
    mergeUpsertUpdateData,
    generateExtendedMessages,
    defineStatusAndInfoFromHistoryData
}