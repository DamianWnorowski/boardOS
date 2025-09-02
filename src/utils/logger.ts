type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];

  private log(level: LogLevel, message: string, context?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context
    };

    this.logs.push(entry);

    // Keep only last 100 logs to prevent memory leaks
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Only console.log in development
    if (this.isDevelopment) {
      const logMethod = console[level] || console.log;
      if (context) {
        logMethod(`[${level.toUpperCase()}] ${message}`, context);
      } else {
        logMethod(`[${level.toUpperCase()}] ${message}`);
      }
    }
  }

  debug(message: string, context?: unknown) {
    this.log('debug', message, context);
  }

  info(message: string, context?: unknown) {
    this.log('info', message, context);
  }

  warn(message: string, context?: unknown) {
    this.log('warn', message, context);
  }

  error(message: string, context?: unknown) {
    this.log('error', message, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
export default logger;