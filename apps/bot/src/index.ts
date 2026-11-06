import { parseConfig } from '@binarybot/core';
import { Bot } from './bot.js';

const bot = new Bot(parseConfig());

await bot.start();
