/***********************************************************************
 *  İŞLEV: Unique kodlar olusturmaya yardimci olan fonksiyonlar iceren dosya
 ***********************************************************************/

 /**********************************************
 * Fonksiyon: generateUniqueCode
 * Açıklama:  Unique kodlar olusturmaya yardimci olan fonksiyonlar iceren dosya
 * Girdi(ler): NULL
 * Çıktı: string
 **********************************************/
function generateUniqueCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let code = '';

    // 6 rakam üret
    for (let i = 0; i < 7; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    let result = "\n\n" + "PRO-" + code;
    return result;
}

module.exports={
    generateUniqueCode
}