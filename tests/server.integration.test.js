const request = require('supertest');
const { createApp } = require('../src/server');

describe('server integration', () => {
  test('health endpoint works', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
