type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Send log to Vite dev server via HMR WebSocket.
 * Logs appear in `docker logs charon-frontend`, NOT in browser console.
 */
const sendToServer = (level: LogLevel, args: unknown[]) => {
  if (import.meta.hot) {
    import.meta.hot.send('browser-log', { level, args });
  }
};

const createLogger = (): Logger => {
  return {
    debug: (...args: unknown[]) => sendToServer('debug', args),
    info: (...args: unknown[]) => sendToServer('info', args),
    warn: (...args: unknown[]) => sendToServer('warn', args),
    error: (...args: unknown[]) => sendToServer('error', args),
  };
};

export const logger = createLogger();
