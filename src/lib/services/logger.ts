// Enterprise-grade Logger Service
// Supports log levels, timestamps, contexts, and formatting

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class LoggerService {
  private minLevel: LogLevel = import.meta.env.DEV
    ? LogLevel.DEBUG
    : LogLevel.WARN;
  private logs: LogEntry[] = [];
  private readonly maxLogSize = 1000;

  constructor() {
    this.info("LoggerService", "Logger initialized");
  }

  public setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  public debug(context: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  public info(context: string, message: string, data?: any) {
    this.log(LogLevel.INFO, context, message, data);
  }

  public warn(context: string, message: string, data?: any) {
    this.log(LogLevel.WARN, context, message, data);
  }

  public error(context: string, message: string, error?: any) {
    this.log(LogLevel.ERROR, context, message, error);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  private log(level: LogLevel, context: string, message: string, data?: any) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    const formattedMessage = `[${entry.timestamp}] [${LogLevel[level]}] [${context}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data || "");
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data || "");
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data || "");
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data || "");
        break;
    }
  }
}

export const logger = new LoggerService();
