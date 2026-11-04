import { pino, type DestinationStream, type Logger } from 'pino';
import type { AppConfig } from './config.js';

// Re-export pino's logger type
export type { Logger };

/**
 * Create a pino logger
 *
 * @param config - Application configuration
 * @param destination - Optional destination to output to
 * @returns logger
 */
export const createLogger = (
  config: AppConfig,
  destination?: DestinationStream,
): Logger => {
  const options = { // https://getpino.io/#/docs/api?id=options-object
    level: config.logLevel.toLowerCase(),
    redact: {
      paths: ['token', 'discordToken'],
      censor: '[redacted]',
    },
  };

  return destination ? pino(options, destination) : pino(options);
};
