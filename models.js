const mongoose = require('mongoose');

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

const UserSettingsSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  rebirthColor: { type: String, default: '#2ECC71' },
  prestigeColor: { type: String, default: '#F1C40F' }
});

module.exports = {
  UserStat: mongoose.model('UserStat', UserStatSchema),
  UserTimezone: mongoose.model('UserTimezone', UserTimezoneSchema),
  UserSettings: mongoose.model('UserSettings', UserSettingsSchema)
};
