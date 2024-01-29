function generateUniqueCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let code = '';

    // 6 harf üret
    for (let i = 0; i < 6; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // 6 rakam üret
    for (let i = 0; i < 6; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    let result = "\n\n" + code;
    return result;
}

module.exports={
    generateUniqueCode
}