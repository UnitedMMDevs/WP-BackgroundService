/***********************************************************************
 *  İŞLEV: Statik Konfigurasyon bilgilerinin belirlendigi yardimci objeler
 *  AÇIKLAMA:
 *      Bu kod dosyasinda servisin ihtiyaci oldugu bir takim datalara \
 *      - global olarak ulasabilmek icin hazirlanmis yardimci objeleri icerir.
 ***********************************************************************/

//# =============================================================================
//# Lib imports
//# =============================================================================
const path = require('path');
const os = require('os');

 /**********************************************
 * Fonksiyon: getRootPath
 * Açıklama: Sandbox ortaminin isletim sistemi uzerindeki yolunu alir.
 * Girdi(ler): NULL
 * Çıktı: string
 **********************************************/
getRootPath = () => {
    const filepath = `${path.parse(os.homedir()).root}home/.sandbox/`;
    return filepath;
}

const baseBanner = `
██╗░░░██╗███╗░░██╗██╗████████╗███████╗██████╗░  ███╗░░░███╗███╗░░░███╗  ██████╗░███████╗██╗░░░██╗░██████╗
██║░░░██║████╗░██║██║╚══██╔══╝██╔════╝██╔══██╗  ████╗░████║████╗░████║  ██╔══██╗██╔════╝██║░░░██║██╔════╝
██║░░░██║██╔██╗██║██║░░░██║░░░█████╗░░██║░░██║  ██╔████╔██║██╔████╔██║  ██║░░██║█████╗░░╚██╗░██╔╝╚█████╗░
██║░░░██║██║╚████║██║░░░██║░░░██╔══╝░░██║░░██║  ██║╚██╔╝██║██║╚██╔╝██║  ██║░░██║██╔══╝░░░╚████╔╝░░╚═══██╗
╚██████╔╝██║░╚███║██║░░░██║░░░███████╗██████╔╝  ██║░╚═╝░██║██║░╚═╝░██║  ██████╔╝███████╗░░╚██╔╝░░██████╔╝
░╚═════╝░╚═╝░░╚══╝╚═╝░░░╚═╝░░░╚══════╝╚═════╝░  ╚═╝░░░░░╚═╝╚═╝░░░░░╚═╝  ╚═════╝░╚══════╝░░░╚═╝░░░╚═════╝░`;
const globalConfig = {
    mongo_url: "mongodb://127.0.0.1:27017/proWhatsApp",
    baseRootPath: getRootPath(),
    LogTypes: {
        info: 'info',
        error: 'error',
        warn: 'warn'
    },
    LogLocations: {
        all: 'ALL',
        consoleAndDb: 'CONSOLE&DB',
        consoleAndFile: 'CONSOLE&FILE',
        console: 'CONSOLE',
        db: 'DB',
        file: 'FILE',
    }
}
module.exports = { globalConfig, baseBanner };
