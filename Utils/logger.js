/***********************************************************************
 *  İŞLEV: Logger siniflarinin uretildi dosya
 *  AÇIKLAMA:
 *      Bu dosya farkli ortamlarda loglama islemini gerceklestirilen siniflarin
 *      -   kodlandigi alandir.
 ***********************************************************************/

//# =============================================================================
//# Lib imports
//# =============================================================================
require('winston-mongodb');
const winston = require('winston');
const dailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const { globalConfig } = require('./config');

/***********************************************************************
 *  İŞLEV: Console ekranina loglama yapan log servisi
 *  AÇIKLAMA:
 *      Console ekranina loglama yapmak icin kullanilan util servisi
 ***********************************************************************/
class ConsoleLogger {
    constructor() {
        this.logger = winston.createLogger(
            {
                transports: [new winston.transports.Console()],
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message, service }) => {
                        return `[${timestamp}] [${service}]-[${level}] => [${message}]]`
                    })
                ),
                defaultMeta: {
                    service: "Pro-WhatsApp-Queue-Service"
                }
            }
        )
    };
    log = (level, message) => {
        this.logger.log(level, message);
    }

}
/***********************************************************************
 *  İŞLEV: Dosyalara loglama yapan log servisi
 *  AÇIKLAMA:
 *      Dosyalara loglama yapmak icin kullanilan util servisi
 *      -   Gun sinirlamasi ayarlanip belirli bir sureden sonra kendi kendine
 *      -   olusturulmus dosyalari silen mekanizma ile kodlanmistir.
 ***********************************************************************/
class FileLogger {
    
    constructor() {
        this.logPath = path.join(__dirname, '../logs/');
        if(!fs.existsSync(this.logPath))
            fs.mkdirSync(this.logPath); 
        this.logger = winston.createLogger(
            {
                transports: [new dailyRotateFile({
                    filename: path.join(this.logPath, 'app-%DATE%.log'),
                    datePattern: 'DD-MM-YYYY',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '45d',
                })],

                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message, service }) => {
                        return `[${timestamp}] [${service}]-[${level.toUpperCase()}] => [${message}]]`
                    })
                ),
                defaultMeta: {
                    service: "Pro-WhatsApp-Queue-Service"
                }
            }
        )
    }
    log = (level, message) => {
        this.logger.log(level, message);
    }
}
/***********************************************************************
 *  İŞLEV: Veri tabanina loglama yapan servis
 *  AÇIKLAMA:
 *      Veri tabanina loglama yapmak icin kullanilan util servisi
 ***********************************************************************/
class DbLogger {
    constructor() {
        this.logger = winston.createLogger(
            {
                transports: [new winston.transports.MongoDB({
                    db: globalConfig.mongo_url,
                    options: { useUnifiedTopology: true },
                    collection: 'service-logs',
                })],
                format: winston.format.json(),
                defaultMeta: {
                    service: "Pro-WhatsApp-Queue-Service"
                },
            }
        )
    }
    log = (level, message) => {
        this.logger.log(level, message);
    }
}

/***********************************************************************
 *  İŞLEV: Butun loggerlari bir arada tutup ihtiyaca gore log ortamini ayarlayan servis
 ***********************************************************************/
class LoggerService {
    constructor(
        fileLogger, 
        dbLogger, 
        consoleLogger) {
        this.fileLogger = fileLogger;
        this.consoleLogger = consoleLogger;
        this.dbLogger = dbLogger;
    }

     /**********************************************
     * Fonksiyon: Log
     * Açıklama: Belirtilen log leveli ve lokasyona gore
     *  -   ortamlarinin tercihlerinin yapildigi ve 
     *  -   loglama isleminin yapildigi fonksiyondur
     * Girdi(ler): type, location, message
     * Çıktı: NULL
     **********************************************/
    Log(type, location, message) {
        switch (location) {
            case 'ALL':
                {
                    this.consoleLogger.log(type, message);
                    this.fileLogger.log(type, message);
                    this.dbLogger.log(type, message);
                    break;
                }
            case 'CONSOLE&DB':
                {
                    this.consoleLogger.log(type, message);
                    this.dbLogger.log(type, message);
                    break;
                }
            case 'CONSOLE&FILE':
                {
                    this.consoleLogger.log(type, message);
                    this.fileLogger.log(type, message);
                    break;
                }
            case 'CONSOLE':
                {
                    this.consoleLogger.log(type, message);
                    break;
                }
            case 'DB':
                {
                    this.dbLogger.log(type, message);
                    break;
                }
            case 'FILE':
                {
                    this.fileLogger.log(type, message);
                    break;
                }
        }

    }

}

const fileLogger = new FileLogger();
const dbLogger = new DbLogger();
const consoleLogger = new ConsoleLogger();
const loggerService = new LoggerService(fileLogger, dbLogger, consoleLogger);

module.exports = {
    logger: loggerService,
}
