import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, type AppConfig } from '@binarybot/core';
import { BotClient } from './client.js';

const config: AppConfig = {
  discordToken: 'test-token',
  discordGuildId: 'test-guild',
  logLevel: 'SILENT',
  nodeEnv: 'test',
};

describe('BotClient', () => {
  it('exposes the config and logger it was created with', () => {
    const destination = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    const logger = createLogger(config, destination);
    const client = new BotClient(config, logger);

    expect(client.config).toBe(config);
    expect(client.logger).toBe(logger);
  });
});
