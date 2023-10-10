require('winston-mongodb');
const winston = require('winston');
const dailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const {globalConfig} = require('../model/config');


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
                    service: "Pro-Whats-App-Service"
                }
            }
        )
    };
    log = (level, message) => {
        this.logger.log(level, message);
    }

}
class FileLogger {
    
    constructor() {
        this.logPath = path.join(__dirname, 'logs');
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
                    winston.format.colorize(),
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message, service }) => {
                        return `[${timestamp}] [${service}]-[${level.toUpperCase()}] => [${message}]]`
                    })
                ),
                defaultMeta: {
                    service: "Pro-Whats-App-Service"
                }
            }
        )
    }
    log = (level, message) => {
        this.logger.log(level, message);
    }
}
class DbLogger {
    
    constructor() {
        this.logger = winston.createLogger(
            {
                transports: [new winston.transports.MongoDB({
                    db: globalConfig.mongo_url,
                    options: { useUnifiedTopology: true },
                    collection: 'Logs',
                })],
                format: winston.format.json(),
                defaultMeta: {
                    service: "Pro-Whats-App-Service"
                }
            }
        )
    }
    log = (level, message) => {
        this.logger.log(level, message);
    }
}


class LoggerService {


    constructor(
        fileLogger, 
        dbLogger, 
        consoleLogger) {
        this.fileLogger = fileLogger;
        this.consoleLogger = consoleLogger;
        this.dbLogger = dbLogger;
    }


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