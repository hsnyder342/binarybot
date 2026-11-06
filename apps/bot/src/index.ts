import { createLogger, HealthRegistry, parseConfig } from '@binarybot/core';
import { BotClient } from './client.js';

const config = parseConfig();
const logger = createLogger(config);
const health = new HealthRegistry();
const client = new BotClient(config, logger, health);

client.once('clientReady', () => {
  logger.info('Bot is ready!');
  logger.info('Loading services...');
});

client.login(config.discordToken);
