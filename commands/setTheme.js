const { MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('theme')
    .setDescription('Choose a graph theme')
    .addStringOption(option => option
      .setName('value')
      .setDescription('Choose a theme')
      .setRequired(true)
      .addChoices(
        { name: 'Dark', value: 'dark' },
        { name: 'Light', value: 'light' }
      )),

  async execute(interaction, { UserSettings }) {
    const settings = await UserSettings.findOneAndUpdate(
      { userId: interaction.user.id },
      {},
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    settings.theme = interaction.options.getString('value');
    await settings.save();
    return interaction.reply({
      content: `Graph theme set to **${settings.theme}**.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
