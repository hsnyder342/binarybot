import { Events } from 'discord.js';
import {
  createLogger,
  HealthRegistry,
  ServiceRegistry,
  type AppConfig,
  type Health,
  type Logger,
} from '@binarybot/core';
import { BotClient } from './client.js';

export class Bot {
  readonly logger: Logger;
  readonly client: BotClient;
  readonly health = new HealthRegistry();
  readonly services: ServiceRegistry<BotClient>;

  readonly #clientHealth: Health;

  constructor(readonly config: AppConfig) {
    this.logger = createLogger(config);
    this.client = new BotClient(config, this.logger);
    this.#clientHealth = this.health.register('client');
    this.services = new ServiceRegistry<BotClient>(this.health, {
      client: this.client,
      config,
      logger: this.logger,
    });
  }

  async start(): Promise<void> {
    this.client.once(Events.ClientReady, () => {
      this.logger.info('bot is ready');
      this.#clientHealth.markReady();
      void this.services.startAll();
    });

    await this.client.login(this.config.discordToken);
  }

  async stop(): Promise<void> {
    await this.services.stopAll();
    this.health.markAllNotReady();
    await this.client.destroy();
  }
}
