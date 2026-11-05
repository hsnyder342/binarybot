import { Client, type ClientOptions } from 'discord.js';
import {
  ServiceRegistry,
  type AppConfig,
  type Logger,
  type Service,
} from '@binarybot/core';

export class BotClient extends Client {
  readonly services = new ServiceRegistry<BotClient>();

  constructor(
    readonly config: AppConfig,
    readonly logger: Logger,
    options: ClientOptions = { intents: [] },
  ) {
    super(options);
  }

  registerService(service: Service<BotClient>): void {
    this.services.register(service);
  }
}
