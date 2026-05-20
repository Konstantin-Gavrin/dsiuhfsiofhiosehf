function isEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email);
}

function assert(condition, message, status = 400) {
  if (!condition) {
    const err = new Error(message);
    err.status = status;
    throw err;
  }
}

function validateRegister(body) {
  assert(body && typeof body === 'object', 'Invalid payload');
  assert(isEmail(body.email), 'Invalid email');
  assert(typeof body.password === 'string' && body.password.length >= 8, 'Password must be at least 8 characters');
}

function validateDevicePayload(body) {
  assert(body && typeof body === 'object', 'Invalid payload');
  assert(typeof body.name === 'string' && body.name.trim().length > 1, 'Device name is required');
  assert(typeof body.address === 'string' && body.address.trim().length > 2, 'Device address is required');
  assert(Number.isFinite(Number(body.threshold)), 'threshold must be number');
  if (body.powerKw !== undefined) {
    assert(Number.isFinite(Number(body.powerKw)) && Number(body.powerKw) >= 0, 'powerKw must be >= 0');
  }
}

module.exports = {
  assert,
  validateRegister,
  validateDevicePayload,
};
