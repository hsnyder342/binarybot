import { Client } from 'discord.js';

const client = new Client({
  intents: [],
});

client.once('clientReady', () => {
  console.log('Bot is ready!');
});

client.login(process.env.DISCORD_TOKEN);
