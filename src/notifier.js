const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

async function sendDiscord(webhookUrl, text, fallbackUrl) {
  const url = webhookUrl || fallbackUrl || config.discordWebhookUrl;
  if (!url) return false;
  await axios.post(url, { content: text }, { timeout: config.requestTimeoutMs });
  return true;
}

async function sendTelegram(chatId, text, botToken) {
  const token = botToken || config.telegramBotToken;
  if (!token || !chatId) return false;
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  await axios.post(
    endpoint,
    { chat_id: chatId, text },
    { timeout: config.requestTimeoutMs }
  );
  return true;
}

async function notifyUser(user, text) {
  try {
    if (user.notificationChannel === 'discord') {
      return await sendDiscord(user.discordWebhookUrl, text);
    }
    if (user.notificationChannel === 'telegram') {
      return await sendTelegram(user.telegramChatId, text, user.telegramBotToken);
    }
    return false;
  } catch (error) {
    logger.error({
      event: 'notification_failed',
      userId: user.id,
      channel: user.notificationChannel,
      message: error.message,
    });
    return false;
  }
}

module.exports = {
  notifyUser,
};
