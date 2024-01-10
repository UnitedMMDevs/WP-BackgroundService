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