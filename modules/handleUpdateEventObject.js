/***********************************************************************
 *  İŞLEV: Bu js dosyasi kuyruk islemleri mesaj gecmisi olusturmak icin yardimci fonksiyon sunar. 
 *  AÇIKLAMA:
 *      Kuyruk islemleri sirasinda whatsapp uzerinden yakalanan bilgilendirme datalarini islemek ve 
 *      - kuyruk icin gecmis datasi olusturabilmek icin olusturulmus yardimci fonksiyonlari barindirir.
 ***********************************************************************/



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

module.exports = {
    seperateDataFromUpdate,
    seperateDataFromUpsert,
    mergeUpsertUpdateData
}