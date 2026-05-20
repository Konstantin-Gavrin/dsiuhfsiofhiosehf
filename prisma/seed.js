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
      // Ensure existing user is active and has master role
      const updates = {};
      if (!existing.isActive) updates.isActive = true;
      if (existing.role !== 'master') updates.role = 'master';

      // If MASTER_PASSWORD provided, reset password to this value
      const newPassword = process.env.MASTER_PASSWORD;
      if (newPassword && newPassword.length > 0) {
        const newHash = await bcrypt.hash(newPassword, 10);
        updates.password = newHash;
        console.log('MASTER_PASSWORD provided: will update password for', email);
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({ where: { email }, data: updates });
        console.log('Updated existing user to master/activated/updated password as needed:', email);
      } else {
        console.log('Master user already exists and is active:', email);
      }
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, role: 'master', isActive: true } });
    console.log('Created master user:', user.email);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
