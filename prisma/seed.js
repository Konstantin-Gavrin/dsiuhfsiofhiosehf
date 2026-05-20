require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  try {
    const email = process.env.MASTER_EMAIL || 'master@local';
    const password = process.env.MASTER_PASSWORD || 'ChangeMe123!';

    if (!email || !password) {
      console.error('MASTER_EMAIL and MASTER_PASSWORD must be set in env or .env');
      process.exit(1);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('Master user already exists:', email);
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, role: 'master' } });
    console.log('Created master user:', user.email);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
