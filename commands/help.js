const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View command list and usage guide'),
  async execute(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Guide')
      .setDescription('This bot automatically tracks your **Rebirth** & **Prestige** progress from Idle Miner!')
      .addFields(
        { name: '/graph', value: 'Displays a visual graph of your daily stats for the **Last 14 Days** alongside your highest single-day record.' },
        { name: '/set theme value:<dark|light>', value: 'Choose the graph theme.' },
        { name: '/set color chart', value: 'Set one chart color with `category:<rebirth|prestige>` and `value:<hex>`.' },
        { name: '/set timezone gmt:<offset>', value: 'Set your local time zone so daily resets match your local time.' },
        { name: '/reset', value: 'Reset all your data permanently.' },
        { name: 'Automatic Tracking', value: 'Simply play **Idle Miner** as usual (`/play`). The bot tracks your data automatically without manual commands!' },
        { name: 'Buy me a coffee...', value: 'https://buymeacoffee.com/ryaand' }
      )
      .setFooter({ text: 'Oh yea?!' })
      .setTimestamp();
    return interaction.reply({ embeds: [helpEmbed], flags: MessageFlags.Ephemeral });
  }
};
