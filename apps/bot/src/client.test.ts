import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  createLogger,
  type AppConfig,
  type Service,
} from '@binarybot/core';
import { BotClient } from './client.js';

const config: AppConfig = {
  discordToken: 'test-token',
  discordGuildId: 'test-guild',
  logLevel: 'SILENT',
  nodeEnv: 'test',
};

const createClient = (): BotClient => {
  const destination = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  return new BotClient(config, createLogger(config, destination));
};

class TestService implements Service<BotClient> {
  readonly name = 'test-service';

  start(): void {}

  stop(): void {}
}

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

  it('registers services by name', () => {
    const client = createClient();
    const service = new TestService();

    client.registerService(service);

    expect(client.services.services.get('test-service')).toBe(service);
  });

  it('rejects duplicate service names', () => {
    const client = createClient();
    client.registerService(new TestService());

    expect(() => client.registerService(new TestService())).toThrow(
      'Service "test-service" is already registered',
    );
  });
});
