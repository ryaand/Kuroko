const IDLE_MINER_BOT_ID = '518759221098053634';

function createIdleMinerTracker({ UserStat, UserTimezone }) {
  async function getUserLocalDateTime(userId) {
    const userTz = await UserTimezone.findOne({ userId });
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
    if (embed.fields) embed.fields.forEach(f => { fullText += `${f.name} ${f.value} `; });

    const rebirthMatch = fullText.match(/\*?\*?Rebirth:\*?\*?\s*([\d,]+)/i);
    const prestigeMatch = fullText.match(/\*?\*?Prestige:\*?\*?\s*([\d,]+)/i);
    if (!rebirthMatch) return;

    const currentRebirths = parseInt(rebirthMatch[1].replace(/,/g, '')) || 0;
    const currentPrestiges = prestigeMatch ? (parseInt(prestigeMatch[1].replace(/,/g, '')) || 0) : 0;
    const userLocalTime = await getUserLocalDateTime(userId);
    const today = userLocalTime.toISOString().split('T')[0];

    try {
      const lastOverallRecord = await UserStat.findOne({ userId }).sort({ lastUpdated: -1 });
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

      let todayRecord = await UserStat.findOne({ userId, date: today });
      if (!todayRecord) {
        todayRecord = new UserStat({
          userId,
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
      console.error('Failed to save DB:', err);
    }
  }

  return { getUserLocalDateTime, processIdleMinerEmbed };
}

module.exports = { createIdleMinerTracker };
