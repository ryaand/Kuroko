require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
  AttachmentBuilder
} = require('discord.js');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

const IDLE_MINER_BOT_ID = '518759221098053634';

const express = require('express');
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

// Database Schemas
const UserStatSchema = new mongoose.Schema({
  userId: String,
  date: String,
  lastRebirths: { type: Number, default: 0 },
  lastPrestiges: { type: Number, default: 0 },
  gainedRebirths: { type: Number, default: 0 },
  gainedPrestiges: { type: Number, default: 0 },
  lastChannelId: String,
  lastMessageId: String,
  lastUpdated: Date
});

const UserTimezoneSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  gmtOffset: { type: Number, default: 0 }
});

const UserStat = mongoose.model('UserStat', UserStatSchema);
const UserTimezone = mongoose.model('UserTimezone', UserTimezoneSchema);

// Canvas
const width = 800;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: '#2b2d31'
});

async function generateLast7DaysGraph(labels, rebirthData, prestigeData) {
  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Prestiges',
          data: prestigeData,
          backgroundColor: '#F1C40F',
          borderRadius: 0,
          stack: 'combined'
        },
        {
          label: 'Rebirths',
          data: rebirthData,
          backgroundColor: '#2ECC71',
          borderRadius: 0,
          stack: 'combined'
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          labels: {
            color: '#FFFFFF',
            font: { size: 14, weight: 'bold' }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#B5BAC1', font: { size: 12 } },
          grid: { color: '#3f4147' }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          stepSize: 10,
          callback: function (value) {
            if ((value - 5) % 10 === 0) {
              return value;
            }
          },
          ticks: { color: '#ffffff', precision: 0, weight: 'bold' },
          grid: { color: '#3f4147' },
          title: {
            display: true,
            text: 'Total Gain (Rebirths & Prestiges)',
            color: '#FFFFFF',
            font: { weight: 'bold', size: 13 }
          }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

async function getUserLocalDateTime(userId) {
  let userTz = await UserTimezone.findOne({ userId: userId });
  const offsetHours = userTz ? userTz.gmtOffset : 0;
  const now = new Date();
  return new Date(now.getTime() + offsetHours * 3600 * 1000);
}

async function processIdleMinerEmbed(message) {
  if (message.author.id !== IDLE_MINER_BOT_ID || message.embeds.length === 0) return;
  if (message.interaction?.commandName !== 'play') return;

  const interactionUser = message.interaction?.user || message.interactionMetadata?.user;
  if (!interactionUser) return;

  const userId = interactionUser.id;
  const embed = message.embeds[0];
  let fullText = `${embed.title || ''} ${embed.description || ''} ${embed.author?.name || ''} `;
  if (embed.fields) {
    embed.fields.forEach(f => fullText += `${f.name} ${f.value} `);
  }

  const rebirthMatch = fullText.match(/\*?\*?Rebirth:\*?\*?\s*([\d,]+)/i);
  const prestigeMatch = fullText.match(/\*?\*?Prestige:\*?\*?\s*([\d,]+)/i);

  if (rebirthMatch) {
    const currentRebirths = parseInt(rebirthMatch[1].replace(/,/g, '')) || 0;
    const currentPrestiges = prestigeMatch ? (parseInt(prestigeMatch[1].replace(/,/g, '')) || 0) : 0;

    const userLocalTime = await getUserLocalDateTime(userId);
    const today = userLocalTime.toISOString().split('T')[0];

    try {
      const lastOverallRecord = await UserStat.findOne({ userId: userId }).sort({ lastUpdated: -1 });

      let deltaRebirth = 0;
      let deltaPrestige = 0;

      if (lastOverallRecord) {
        const oldRebirths = typeof lastOverallRecord.lastRebirths === 'number' ? lastOverallRecord.lastRebirths : currentRebirths;
        const oldPrestiges = typeof lastOverallRecord.lastPrestiges === 'number' ? lastOverallRecord.lastPrestiges : currentPrestiges;

        deltaPrestige = currentPrestiges - oldPrestiges;

        if (deltaPrestige > 0) {
          const baseRebirthGain = currentRebirths - oldRebirths;
          deltaRebirth = baseRebirthGain + (deltaPrestige * 25);
        } else {
          deltaRebirth = currentRebirths - oldRebirths;
        }

        if (isNaN(deltaRebirth) || deltaRebirth < 0) deltaRebirth = 0;
        if (isNaN(deltaPrestige) || deltaPrestige < 0) deltaPrestige = 0;
      }

      let todayRecord = await UserStat.findOne({ userId: userId, date: today });

      if (!todayRecord) {
        todayRecord = new UserStat({
          userId: userId,
          date: today,
          lastRebirths: currentRebirths,
          lastPrestiges: currentPrestiges,
          gainedRebirths: deltaRebirth,
          gainedPrestiges: deltaPrestige,
          lastChannelId: message.channel.id,
          lastMessageId: message.id,
          lastUpdated: new Date()
        });
      } else {
        const existingGainRb = typeof todayRecord.gainedRebirths === 'number' && !isNaN(todayRecord.gainedRebirths) ? todayRecord.gainedRebirths : 0;
        const existingGainPres = typeof todayRecord.gainedPrestiges === 'number' && !isNaN(todayRecord.gainedPrestiges) ? todayRecord.gainedPrestiges : 0;

        todayRecord.gainedRebirths = existingGainRb + deltaRebirth;
        todayRecord.gainedPrestiges = existingGainPres + deltaPrestige;
        todayRecord.lastRebirths = currentRebirths;
        todayRecord.lastPrestiges = currentPrestiges;
        todayRecord.lastChannelId = message.channel.id;
        todayRecord.lastMessageId = message.id;
        todayRecord.lastUpdated = new Date();
      }

      await todayRecord.save();
    } catch (err) {
      console.error("Failed to save DB:", err);
    }
  }
}

client.on('messageCreate', async (message) => {
  await processIdleMinerEmbed(message);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  try {
    const fetchedMsg = newMessage.partial ? await newMessage.fetch() : newMessage;
    await processIdleMinerEmbed(fetchedMsg);
  } catch (e) { }
});

const commands = [
  new SlashCommandBuilder()
    .setName('graph')
    .setDescription('Check rebirth & prestige last stats graph'),
  new SlashCommandBuilder()
    .setName('settimezone')
    .setDescription('Set your GMT time zone (range from GMT-12 to GMT+14)')
    .addNumberOption(option =>
      option.setName('gmt')
        .setDescription('GMT offset value, default is 0 (e.g., "-12" for GMT-12)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View command list and usage guide'),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset all your data'),
].map(command => command.toJSON());

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
  } catch (error) {
  }
});

// Handler slash command
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Handler /help
  if (interaction.commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Rebirth Weekly Counter guide')
      .setDescription('This bot automatically tracks your **Rebirth** & **Prestige** progress from Idle Miner!')
      .addFields(
        {
          name: '/graph',
          value: 'Displays a visual graph of your daily stats for the **Last 7 Days** alongside your highest single-day record.'
        },
        {
          name: '/settimezone [gmt]',
          value: 'Sets your local time zone so daily resets match your local time (e.g., `/settimezone gmt: 7` for GMT+7).'
        },
        {
          name: '/reset',
          value: 'Reset all your data permanently.'
        },
        {
          name: 'Automatic Tracking',
          value: 'Simply play **Idle Miner** as usual (`/play`). The bot tracks your data automatically without manual commands!'
        }
      )
      .setFooter({ text: 'Oh yea?!' })
      .setTimestamp();

    return interaction.reply({
      embeds: [helpEmbed],
      flags: MessageFlags.Ephemeral
    });
  }

  // Handler /settimezone
  if (interaction.commandName === 'settimezone') {
    let gmtValue = interaction.options.getNumber('gmt');
    gmtValue = Math.round(gmtValue * 4) / 4;

    if (gmtValue < -12 || gmtValue > 14) {
      return interaction.reply({ content: 'GMT value must be between **-12** to **14**!', flags: MessageFlags.Ephemeral });
    }

    await UserTimezone.findOneAndUpdate(
      { userId: interaction.user.id },
      { gmtOffset: gmtValue },
      { upsert: true, returnDocument: 'after' }
    );

    const sign = gmtValue >= 0 ? '+' : '';
    return interaction.reply({
      content: `Your time zone has been successfully set to **GMT${sign}${gmtValue}**!`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Handler /reset
  if (interaction.commandName === 'reset') {
    const confirmEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Reset Data Confirmation')
      .setDescription('Are you sure you want to reset **ALL** your data?\n\n*This action cannot be undone!*');

    const btnYes = new ButtonBuilder()
      .setCustomId('confirm_reset_yes')
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success);

    const btnNo = new ButtonBuilder()
      .setCustomId('confirm_reset_no')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(btnYes, btnNo);

    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'confirm_reset_yes') {
        await UserStat.deleteMany({ userId: i.user.id });

        await i.update({
          content: '**Success!** All your data has been reseted.',
          embeds: [],
          components: []
        });
      }
      else if (i.customId === 'confirm_reset_no') {
        await i.update({
          content: '**Cancelled.**',
          embeds: [],
          components: []
        });
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        try {
          await interaction.editReply({
            content: '**Timeout.** You took too long to respond. Command cancelled.',
            embeds: [],
            components: []
          });
        } catch (e) {
        }
      }
    });
  }

  // Handler /graph
  if (interaction.commandName === 'graph') {
    await interaction.deferReply();

    const targetUser = interaction.user;

    try {
      const userLatestRecord = await UserStat.findOne({ userId: targetUser.id }).sort({ lastUpdated: -1 });

      if (userLatestRecord && userLatestRecord.lastChannelId && userLatestRecord.lastMessageId) {
        try {
          const targetChannel = await client.channels.fetch(userLatestRecord.lastChannelId);
          if (targetChannel) {
            const freshEmbedMsg = await targetChannel.messages.fetch(userLatestRecord.lastMessageId);
            if (freshEmbedMsg) {
              await processIdleMinerEmbed(freshEmbedMsg);
            }
          }
        } catch (e) { }
      }

      const userRecords = await UserStat.find({ userId: targetUser.id });

      if (userRecords.length === 0) {
        return interaction.editReply({
          content: `There is no data recorded yet, do \`/play\` on Idle Miner first!`
        });
      }

      const userNow = await getUserLocalDateTime(targetUser.id);
      const labels = [];
      const rebirthData = [];
      const prestigeData = [];

      const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 13; i >= 0; i--) {
        const d = new Date(userNow.getTime() - i * 24 * 60 * 60 * 1000);

        const year = d.getUTCFullYear();
        const monthNum = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getUTCDate()).padStart(2, '0');

        const dateStr = `${year}-${monthNum}-${dayNum}`;
        const dayName = daysName[d.getUTCDay()];

        labels.push(`${monthNum}/${dayNum}`);

        const record = userRecords.find(r => r.date === dateStr);
        if (record) {
          rebirthData.push(record.gainedRebirths || 0);
          prestigeData.push(record.gainedPrestiges || 0);
        } else {
          rebirthData.push(0);
          prestigeData.push(0);
        }
      }

      const highestRecord = userRecords.reduce((max, record) => {
        return (record.gainedRebirths || 0) > (max.gainedRebirths || 0) ? record : max;
      }, userRecords[0]);

      const tzData = await UserTimezone.findOne({ userId: targetUser.id });
      const currentGmt = tzData ? tzData.gmtOffset : 0;
      const gmtSign = currentGmt >= 0 ? '+' : '';

      const imageBuffer = await generateLast7DaysGraph(labels, rebirthData, prestigeData);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'graph.png' });

      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}`)
        .setColor(0x5865F2)
        .setDescription(`Timezone: **GMT${gmtSign}${currentGmt}**`)
        .addFields(
          {
            name: 'Highest Daily Record',
            value: `**${highestRecord.gainedRebirths || 0}** Rebirths | **${highestRecord.gainedPrestiges || 0}** Prestiges *(${highestRecord.date})*`
          }
        )
        .setImage('attachment://graph.png')
        .setFooter({ text: 'Rebirth Weekly Counter' })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [attachment]
      });

    } catch (err) {
      console.error("Failed to execute:", err);
      await interaction.editReply({ content: "Failed fetching graph data" });
    }
  }
});

mongoose.connect(MONGO_URI).then(() => {
  console.log("Running...");
  client.login(BOT_TOKEN);
});