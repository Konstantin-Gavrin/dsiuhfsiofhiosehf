const { calculateSavings } = require('../src/reportService');

describe('savings report algorithm', () => {
  test('calculates absolute and percent savings', () => {
    const result = calculateSavings({
      fixedPrice: 0.2,
      avgSpotPrice: 0.1,
      weightedHours: 10,
    });

    expect(result.fixedCost).toBe(2);
    expect(result.realCost).toBe(1);
    expect(result.savedEur).toBe(1);
    expect(result.savedPercent).toBe(50);
  });
});
