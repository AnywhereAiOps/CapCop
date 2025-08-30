export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

export class Logger {
    private level: LogLevel = LogLevel.INFO;
    private prefix = '[CapCop]';

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    debug(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`${this.prefix} [DEBUG] ${message}`, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.INFO) {
            console.info(`${this.prefix} [INFO] ${message}`, ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.WARN) {
            console.warn(`${this.prefix} [WARN] ${message}`, ...args);
        }
    }

    error(message: string, error?: any, ...args: any[]): void {
        if (this.level <= LogLevel.ERROR) {
            if (error) {
                console.error(`${this.prefix} [ERROR] ${message}`, error, ...args);
            } else {
                console.error(`${this.prefix} [ERROR] ${message}`, ...args);
            }
        }
    }
}
