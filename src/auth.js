const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('./config');
const prisma = new PrismaClient();

async function register({ email, password, role = 'user' }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('User already exists');
  if (!email || !password || password.length < 8) {
    throw new Error('Email and password(>=8) are required');
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, role },
  });
  return user;
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('User is deactivated');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid credentials');
  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  return { token, user };
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { register, login, verifyToken };
