const axios = require('axios');
const logger = require('./logger');
const config = require('./config');

async function testDeviceConnection(address) {
  if (address.startsWith('mock://')) {
    return { ok: true, details: 'mock device accepted' };
  }

  const probeUrl = address.startsWith('http') ? address : `http://${address}`;
  try {
    await axios.get(probeUrl, { timeout: config.requestTimeoutMs });
    return { ok: true, details: 'reachable' };
  } catch (error) {
    return { ok: false, details: error.message };
  }
}

async function dispatchCommand(prisma, device, command, reason, priceEur) {
  let success = true;
  let status = 'sent';

  if (!device.address.startsWith('mock://')) {
    const url = device.address.startsWith('http')
      ? `${device.address}?command=${command}`
      : `http://${device.address}?command=${command}`;
    try {
      await axios.get(url, { timeout: config.requestTimeoutMs });
    } catch (error) {
      success = false;
      status = 'failed';
      logger.error({
        event: 'device_command_failed',
        deviceId: device.id,
        command,
        message: error.message,
      });
    }
  }

  await prisma.commandLog.create({
    data: {
      deviceId: device.id,
      command,
      status,
      reason,
      success,
      priceEur,
    },
  });

  await prisma.device.update({
    where: { id: device.id },
    data: { lastStatus: command },
  });

  return { success, status };
}

module.exports = {
  testDeviceConnection,
  dispatchCommand,
};
