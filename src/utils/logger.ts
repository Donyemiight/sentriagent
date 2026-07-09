/**
 * Pino logger — JSON in prod, pretty in dev.
 */

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  ...(config.env !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
    },
  }),
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.apiKey', '*.api_key'],
});