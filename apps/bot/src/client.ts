import { Client, type ClientOptions } from 'discord.js';
import {
  ServiceRegistry,
  type AppConfig,
  type HealthRegistrationOptions,
  type HealthRegistry,
  type Logger,
  type Service,
} from '@binarybot/core';

export class BotClient extends Client {
  readonly services: ServiceRegistry<BotClient>;

  constructor(
    readonly config: AppConfig,
    readonly logger: Logger,
    health: HealthRegistry,
    options: ClientOptions = { intents: [] },
  ) {
    super(options);
    this.services = new ServiceRegistry<BotClient>(health, {
      client: this,
      config,
      logger,
    });
  }

  registerService(
    service: Service<BotClient>,
    options?: HealthRegistrationOptions,
  ): void {
    this.services.register(service, options);
  }
}
