const { convertPrice, determineStatus } = require('../src/priceService');

describe('price decision logic', () => {
  test('converts EUR/MWh to EUR/kWh with VAT', () => {
    expect(convertPrice(100)).toBe(0.122);
  });

  test('turns on below threshold', () => {
    expect(determineStatus(0.05, 0.1)).toBe('ON');
  });

  test('handles negative price with ON rule', () => {
    expect(determineStatus(-0.01, 0.1)).toBe('ON');
  });
});
