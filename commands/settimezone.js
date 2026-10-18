const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settimezone')
    .setDescription('Set your GMT time zone (range from GMT-12 to GMT+14)')
    .addNumberOption(option => option.setName('gmt')
      .setDescription('GMT offset value, default is 0 (e.g., "-12" for GMT-12)')
      .setRequired(true)),
  async execute(interaction, { UserTimezone }) {
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
};
