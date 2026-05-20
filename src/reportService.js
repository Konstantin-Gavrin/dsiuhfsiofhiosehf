function windowStart(period) {
  const now = new Date();
  if (period === 'day') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function summarizePowerHours(commandLogs) {
  const sorted = [...commandLogs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let onSince = null;
  let weightedHours = 0;

  for (const log of sorted) {
    if (log.command === 'ON' && !onSince) {
      onSince = new Date(log.createdAt);
      continue;
    }

    if (log.command === 'OFF' && onSince) {
      const hours = Math.max(0, (new Date(log.createdAt) - onSince) / 3600000);
      weightedHours += hours * (log.device?.powerKw || 1);
      onSince = null;
    }
  }

  if (onSince && sorted.length > 0) {
    const end = new Date();
    weightedHours += ((end - onSince) / 3600000) * (sorted[sorted.length - 1].device?.powerKw || 1);
  }

  return weightedHours;
}

function calculateSavings({ fixedPrice, avgSpotPrice, weightedHours }) {
  const fixedCost = fixedPrice * weightedHours;
  const realCost = avgSpotPrice * weightedHours;
  const savedEur = Number((fixedCost - realCost).toFixed(4));
  const savedPercent = fixedCost > 0 ? Number(((savedEur / fixedCost) * 100).toFixed(2)) : 0;

  return {
    fixedCost: Number(fixedCost.toFixed(4)),
    realCost: Number(realCost.toFixed(4)),
    savedEur,
    savedPercent,
  };
}

async function buildSavingsReport(prisma, userId, period) {
  const from = windowStart(period);

  const [user, logs, prices] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.commandLog.findMany({
      where: {
        createdAt: { gte: from },
        device: { userId },
      },
      include: { device: true },
    }),
    prisma.pricePoint.findMany({ where: { createdAt: { gte: from } } }),
  ]);

  const weightedHours = summarizePowerHours(logs);
  const avgSpotPrice = prices.length
    ? prices.reduce((sum, p) => sum + p.priceEur, 0) / prices.length
    : 0;

  const summary = calculateSavings({
    fixedPrice: user?.fixedPriceEurKwh || 0.15,
    avgSpotPrice,
    weightedHours,
  });

  return {
    period,
    from: from.toISOString(),
    to: new Date().toISOString(),
    fixedPriceEurKwh: user?.fixedPriceEurKwh || 0.15,
    avgSpotPriceEurKwh: Number(avgSpotPrice.toFixed(6)),
    weightedHours: Number(weightedHours.toFixed(4)),
    ...summary,
  };
}

module.exports = {
  buildSavingsReport,
  calculateSavings,
};
