const { authRequired, requireRole } = require('../src/middleware/auth');

jest.mock('../src/auth', () => ({
  verifyToken: jest.fn(() => ({ userId: 1, role: 'master' })),
}));

describe('auth middleware', () => {
  test('rejects missing bearer token', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authRequired(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('blocks forbidden roles', () => {
    const req = { user: { role: 'user' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireRole('master')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
