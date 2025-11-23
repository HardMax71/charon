type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const isDevelopment = import.meta.env.DEV;

const createLogger = (): Logger => {
  const shouldLog = (level: LogLevel): boolean => {
    if (level === 'error' || level === 'warn') {
      return true;
    }
    return isDevelopment;
  };

  return {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log('[DEBUG]', ...args);
      }
    },

    info: (...args: unknown[]) => {
      if (shouldLog('info')) {
        console.log('[INFO]', ...args);
      }
    },

    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn('[WARN]', ...args);
      }
    },

    error: (...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error('[ERROR]', ...args);
      }
    },
  };
};

export const logger = createLogger();
