require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  ActivityType
} = require('discord.js');
const { UserStat, UserTimezone } = require('./models');
const { createIdleMinerTracker } = require('./services/idleMinerTracker');
const commandModules = [
  require('./commands/graph'),
  require('./commands/settimezone'),
  require('./commands/help'),
  require('./commands/reset')
];

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Tracker Bot is Alive');
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const { getUserLocalDateTime, processIdleMinerEmbed } = createIdleMinerTracker({
  UserStat,
  UserTimezone
});

client.on('messageCreate', async message => {
  await processIdleMinerEmbed(message);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  try {
    const fetchedMsg = newMessage.partial ? await newMessage.fetch() : newMessage;
    await processIdleMinerEmbed(fetchedMsg);
  } catch (e) {}
});

const commands = commandModules.map(command => command.data.toJSON());
const commandHandlers = new Map(commandModules.map(command => [command.data.name, command]));

client.once('clientReady', async () => {
  client.user.setActivity('/help', { type: ActivityType.Watching });
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  try {
    const guilds = client.guilds.cache.map(g => g.id);
    for (const guildId of guilds) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
    }
    await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  } catch (error) {}
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = commandHandlers.get(interaction.commandName);
  if (!command) return;
  await command.execute(interaction, {
    UserStat,
    UserTimezone,
    client,
    processIdleMinerEmbed,
    getUserLocalDateTime
  });
});

const mongoose = require('mongoose');
mongoose.connect(MONGO_URI).then(() => {
  console.log('Running...');
  client.login(BOT_TOKEN);
});
