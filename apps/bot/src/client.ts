import { Client, type ClientOptions } from 'discord.js';
import type { AppConfig, Logger } from '@binarybot/core';

export class BotClient extends Client {
  constructor(
    readonly config: AppConfig,
    readonly logger: Logger,
    options: ClientOptions = { intents: [] },
  ) {
    super(options);
  }
}
