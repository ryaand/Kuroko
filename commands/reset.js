const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset all your data'),
  async execute(interaction, { UserStat }) {
    const confirmEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Reset Data Confirmation')
      .setDescription('Are you sure you want to reset **ALL** your data?\n\n*This action cannot be undone!*');
    const btnYes = new ButtonBuilder().setCustomId('confirm_reset_yes').setLabel('Yes').setStyle(ButtonStyle.Success);
    const btnNo = new ButtonBuilder().setCustomId('confirm_reset_no').setLabel('Cancel').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(btnYes, btnNo);
    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });
    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });
    collector.on('collect', async i => {
      if (i.customId === 'confirm_reset_yes') {
        await UserStat.deleteMany({ userId: i.user.id });
        await i.update({ content: '**Success!** All your data has been reseted.', embeds: [], components: [] });
      } else if (i.customId === 'confirm_reset_no') {
        await i.update({ content: '**Cancelled.**', embeds: [], components: [] });
      }
    });
    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        try {
          await interaction.editReply({ content: '**Timeout.** You took too long to respond. Command cancelled.', embeds: [], components: [] });
        } catch (e) {}
      }
    });
  }
};
