const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

async function sendDiscord(targetUrl, text) {
  const url = targetUrl || config.discordWebhookUrl;
  if (!url) return false;
  await axios.post(url, { content: text }, { timeout: config.requestTimeoutMs });
  return true;
}

async function sendTelegram(chatId, text) {
  if (!config.telegramBotToken || !chatId) return false;
  const endpoint = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
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
      return await sendDiscord(user.notificationTarget, text);
    }
    if (user.notificationChannel === 'telegram') {
      return await sendTelegram(user.notificationTarget, text);
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
