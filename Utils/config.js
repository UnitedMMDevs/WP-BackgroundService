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
const dotenv = require("dotenv");


dotenv.config();
 /**********************************************
 * Fonksiyon: getRootPath
 * Açıklama: Sandbox ortaminin isletim sistemi uzerindeki yolunu alir.
 * Girdi(ler): NULL
 * Çıktı: string
 **********************************************/
getRootPath = () => {
    const filepath = `${path.parse(os.homedir()).root}root/.sandbox/`;
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
    env: process.env.NODE_ENV,
    mongo_url_prod: process.env.MONGO_URL_PROD,
    mongo_url_dev: process.env.MONGO_URL_DEV,
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
