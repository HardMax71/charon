import type { Plugin } from 'vite';

/**
 * Vite plugin that receives logs from browser via HMR WebSocket
 * and outputs them to stdout (visible in docker logs).
 */
export function browserLogPlugin(): Plugin {
  return {
    name: 'browser-log-plugin',
    configureServer(server) {
      // Listen for log events from browser
      server.ws.on('browser-log', (data: { level: string; args: unknown[] }) => {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [FRONTEND] [${data.level.toUpperCase()}]`;

        // Format args for output
        const message = data.args
          .map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
          .join(' ');

        // Write to stdout (appears in docker logs)
        process.stdout.write(`${prefix} ${message}\n`);
      });
    },
  };
}
