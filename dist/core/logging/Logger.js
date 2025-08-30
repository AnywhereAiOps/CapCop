export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
export class Logger {
    level = LogLevel.INFO;
    prefix = '[CapCop]';
    setLevel(level) {
        this.level = level;
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`${this.prefix} [DEBUG] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.info(`${this.prefix} [INFO] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(`${this.prefix} [WARN] ${message}`, ...args);
        }
    }
    error(message, error, ...args) {
        if (this.level <= LogLevel.ERROR) {
            if (error) {
                console.error(`${this.prefix} [ERROR] ${message}`, error, ...args);
            }
            else {
                console.error(`${this.prefix} [ERROR] ${message}`, ...args);
            }
        }
    }
}
//# sourceMappingURL=Logger.js.map