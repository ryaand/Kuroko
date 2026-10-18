const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateLast14DaysGraph } = require('../services/graphRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('graph')
    .setDescription('Check rebirth & prestige last stats graph')
    .addUserOption(option => option.setName('target')
      .setDescription('Select a user to view their graph (leave empty for yourself)')
      .setRequired(false)),
  async execute(interaction, { UserStat, UserTimezone, client, processIdleMinerEmbed, getUserLocalDateTime }) {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target') || interaction.user;
    try {
      const userLatestRecord = await UserStat.findOne({ userId: targetUser.id }).sort({ lastUpdated: -1 });
      if (userLatestRecord && userLatestRecord.lastChannelId && userLatestRecord.lastMessageId) {
        try {
          const targetChannel = await client.channels.fetch(userLatestRecord.lastChannelId);
          if (targetChannel) {
            const freshEmbedMsg = await targetChannel.messages.fetch(userLatestRecord.lastMessageId);
            if (freshEmbedMsg) await processIdleMinerEmbed(freshEmbedMsg);
          }
        } catch (e) {}
      }

      const userRecords = await UserStat.find({ userId: targetUser.id });
      if (userRecords.length === 0) {
        const isSelf = targetUser.id === interaction.user.id;
        return interaction.editReply({
          content: isSelf
            ? 'There is no data recorded yet, do `/play` on Idle Miner first!'
            : `There is no data recorded for **${targetUser.username}** yet!`
        });
      }

      const userNow = await getUserLocalDateTime(targetUser.id);
      const labels = [];
      const rebirthData = [];
      const prestigeData = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(userNow.getTime() - i * 24 * 60 * 60 * 1000);
        const year = d.getUTCFullYear();
        const monthNum = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getUTCDate()).padStart(2, '0');
        const dateStr = `${year}-${monthNum}-${dayNum}`;
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

      const highestRecord = userRecords.reduce((max, record) => (
        (record.gainedRebirths || 0) > (max.gainedRebirths || 0) ? record : max
      ), userRecords[0]);
      const tzData = await UserTimezone.findOne({ userId: targetUser.id });
      const currentGmt = tzData ? tzData.gmtOffset : 0;
      const gmtSign = currentGmt >= 0 ? '+' : '';
      const imageBuffer = await generateLast14DaysGraph(
        labels,
        rebirthData,
        prestigeData,
        targetUser.username,
        `GMT${gmtSign}${currentGmt}`
      );
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'graph.png' });
      await interaction.editReply({
        content: `**Highest daily record**\n- Rebirth: ${highestRecord.gainedRebirths || 0}\n- Prestige: ${highestRecord.gainedPrestiges || 0}\n- Date: ${highestRecord.date}`,
        files: [attachment]
      });
    } catch (err) {
      console.error('Failed to execute:', err);
      await interaction.editReply({ content: 'Failed fetching graph data' });
    }
  }
};
