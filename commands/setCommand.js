const { SlashCommandBuilder } = require('discord.js');
const theme = require('./setTheme');
const colorChart = require('./setColorChart');
const timezone = require('./setTimezone');

const subcommands = new Map([
  ['theme', theme],
  ['timezone', timezone]
]);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set')
    .setDescription('Update your graph settings')
    .addSubcommand(themeSubcommand => themeSubcommand
      .setName(theme.data.name)
      .setDescription(theme.data.description)
      .addStringOption(option => option
        .setName('value')
        .setDescription('Choose a theme')
        .setRequired(true)
        .addChoices(
          { name: 'Dark', value: 'dark' },
          { name: 'Light', value: 'light' }
        )))
    .addSubcommand(timezoneSubcommand => timezoneSubcommand
      .setName(timezone.data.name)
      .setDescription(timezone.data.description)
      .addNumberOption(option => option
        .setName('gmt')
        .setDescription('GMT offset from -12 to +14')
        .setRequired(true)))
    .addSubcommandGroup(group => group
      .setName('color')
      .setDescription('Customize chart colors')
      .addSubcommand(chartSubcommand => chartSubcommand
        .setName(colorChart.data.name)
        .setDescription(colorChart.data.description)
        .addStringOption(option => option
          .setName('category')
          .setDescription('Chart color to change')
          .setRequired(true)
          .addChoices(
            { name: 'Rebirth', value: 'rebirth' },
            { name: 'Prestige', value: 'prestige' }
          ))
        .addStringOption(option => option
          .setName('value')
          .setDescription('Hex color, for example #2ECC71')
          .setRequired(true)))),

  async execute(interaction, dependencies) {
    const group = interaction.options.getSubcommandGroup(false);
    const command = group === 'color'
      ? colorChart
      : subcommands.get(interaction.options.getSubcommand());
    if (command) return command.execute(interaction, dependencies);
  }
};
