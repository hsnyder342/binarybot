import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { AppConfig } from './config.js';
import { createLogger } from './logger.js';

const config: AppConfig = {
  discordToken: 'super-secret-token',
  discordGuildId: 'test-guild',
  logLevel: 'INFO',
};

const createDestination = (): { destination: Writable; lines: string[] } => {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });

  return { destination, lines };
};

describe('createLogger', () => {
  it('redacts tokens from structured logs', () => {
    const { destination, lines } = createDestination();
    const logger = createLogger(config, destination);

    logger.info(
      { token: config.discordToken, discordToken: config.discordToken },
      'test message',
    );

    const output = lines.join('');
    expect(output).toContain('[redacted]');
    expect(output).not.toContain(config.discordToken);
  });

  it('normalizes the configured log level', () => {
    const { destination } = createDestination();
    const logger = createLogger(config, destination);

    expect(logger.level).toBe('info');
  });

  it('filters messages below the configured level', () => {
    const { destination, lines } = createDestination();
    const logger = createLogger({ ...config, logLevel: 'ERROR' }, destination);

    logger.info('hidden message');
    logger.error('visible message');

    const output = lines.join('');
    expect(output).not.toContain('hidden message');
    expect(output).toContain('visible message');
  });

  it('supports the silent level', () => {
    const { destination, lines } = createDestination();
    const logger = createLogger({ ...config, logLevel: 'SILENT' }, destination);

    logger.fatal('hidden message');

    expect(logger.level).toBe('silent');
    expect(lines.join('')).toBe('');
  });
});
