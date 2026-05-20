const { dispatchCommand } = require('../src/deviceService');

describe('device command dispatch', () => {
  test('writes command log and updates status for mock device', async () => {
    const prisma = {
      commandLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      device: { update: jest.fn().mockResolvedValue({ id: 99, lastStatus: 'ON' }) },
    };

    const device = { id: 99, address: 'mock://lamp' };
    const result = await dispatchCommand(prisma, device, 'ON', 'test', 0.1);

    expect(result.success).toBe(true);
    expect(prisma.commandLog.create).toHaveBeenCalled();
    expect(prisma.device.update).toHaveBeenCalled();
  });
});
