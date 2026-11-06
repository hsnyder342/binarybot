import { describe, expect, it, vi } from 'vitest';
import {
  type AppConfig,
  type Service,
  type ServiceContext,
} from '@binarybot/core';
import { Bot } from './bot.js';
import { BotClient } from './client.js';

const config: AppConfig = {
  discordToken: 'test-token',
  discordGuildId: 'test-guild',
  logLevel: 'SILENT',
  nodeEnv: 'test',
};

class TestService implements Service<BotClient> {
  readonly name = 'test-service';
  readonly calls: string[] = [];
  context?: ServiceContext<BotClient>;

  start(context: ServiceContext<BotClient>): void {
    this.calls.push('start');
    this.context = context;
    context.health.markReady();
  }

  stop(): void {
    this.calls.push('stop');
  }
}

describe('Bot', () => {
  it('owns the client, logger, health, and services', () => {
    const bot = new Bot(config);

    expect(bot.config).toBe(config);
    expect(bot.client).toBeInstanceOf(BotClient);
    expect(bot.client.config).toBe(config);
    expect(bot.client.logger).toBe(bot.logger);
    expect(bot.health.report()).toEqual({
      ready: false,
      components: { client: false },
    });
    expect(bot.services.names()).toEqual([]);
  });

  it('starts services with the application context', async () => {
    const bot = new Bot(config);
    const service = new TestService();
    bot.services.register(service);

    await bot.services.startAll();

    expect(service.calls).toEqual(['start']);
    expect(service.context?.client).toBe(bot.client);
    expect(service.context?.config).toBe(config);
    expect(service.context?.logger).toBe(bot.logger);
    expect(service.context?.health).toBe(bot.health.for('test-service'));
    expect(bot.services.isRunning('test-service')).toBe(true);
  });

  it('logs in and starts services when the client is ready', async () => {
    const bot = new Bot(config);
    const service = new TestService();
    bot.services.register(service);
    const login = vi.spyOn(bot.client, 'login').mockResolvedValue('test-token');

    await bot.start();

    expect(login).toHaveBeenCalledWith('test-token');
    expect(service.calls).toEqual([]);
    expect(bot.health.isReady()).toBe(false);

    bot.client.emit('clientReady', bot.client as never);

    await vi.waitFor(() => {
      expect(service.calls).toEqual(['start']);
    });
    expect(bot.health.isReady()).toBe(true);
  });

  it('stops services, clears readiness, and destroys the client', async () => {
    const bot = new Bot(config);
    const service = new TestService();
    bot.services.register(service);
    await bot.services.startAll();
    bot.health.for('client').markReady();
    const destroy = vi.spyOn(bot.client, 'destroy').mockResolvedValue();

    expect(bot.health.isReady()).toBe(true);

    await bot.stop();

    expect(service.calls).toEqual(['start', 'stop']);
    expect(bot.services.isRunning('test-service')).toBe(false);
    expect(bot.health.isReady()).toBe(false);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
