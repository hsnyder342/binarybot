import { Client } from 'discord.js';
import { createLogger, parseConfig } from '@binarybot/core';

const client = new Client({ intents: [] });
const config = parseConfig();

client.once('clientReady', () => {
  const logger = createLogger(config);
  logger.info('Bot is ready!');
});

client.login(config.discordToken);
