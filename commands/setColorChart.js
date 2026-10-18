const {
  MessageFlags,
  SlashCommandSubcommandBuilder
} = require('discord.js');

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('chart')
    .setDescription('Set Rebirth and Prestige chart colors')
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
      .setRequired(true)),

  async execute(interaction, { UserSettings }) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } catch (error) {
      if (error.code === 10062) {
        console.warn('Ignoring expired /set color chart interaction.');
        return;
      }
      throw error;
    }

    const category = interaction.options.getString('category');
    const color = interaction.options.getString('value').trim().toUpperCase();
    if (!HEX_COLOR_PATTERN.test(color)) {
      return interaction.editReply({
        content: 'Provide a valid 6-digit hex color, for example `#2ECC71`.',
      });
    }

    const settings = await UserSettings.findOneAndUpdate(
      { userId: interaction.user.id },
      {},
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    settings[`${category}Color`] = color;
    await settings.save();

    const colorsMatch = settings.rebirthColor === settings.prestigeColor;
    if (!colorsMatch) {
      return interaction.editReply({
        content: `**${category[0].toUpperCase()}${category.slice(1)}** color set to \`${color}\`.`,
      });
    }

    return interaction.editReply({
      content: 'Warning: Rebirth and Prestige currently use the same color, so they may be difficult to distinguish in the graph.',
    });
  }
};
