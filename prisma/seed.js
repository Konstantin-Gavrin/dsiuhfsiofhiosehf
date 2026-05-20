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
      let newHash = null;
      if (newPassword && newPassword.length > 0) {
        newHash = await bcrypt.hash(newPassword, 10);
        updates.password = newHash;
        console.log('MASTER_PASSWORD provided: will update password for', email);
      }

      if (Object.keys(updates).length > 0) {
        try {
          // Try normal Prisma update first
          await prisma.user.update({ where: { email }, data: updates });
          console.log('Updated existing user to master/activated/updated password as needed:', email);
        } catch (err) {
          // If Prisma schema on runtime differs, fallback to raw SQL to update columns directly
          console.warn('Prisma update failed, falling back to raw SQL update:', err.message);
          try {
            if (newHash) {
              await prisma.$executeRaw`UPDATE "User" SET password = ${newHash} WHERE email = ${email}`;
            }
            await prisma.$executeRaw`UPDATE "User" SET role = ${'master'} WHERE email = ${email}`;
            // Try both possible column namings for isActive
            try {
              await prisma.$executeRaw`UPDATE "User" SET "isActive" = true WHERE email = ${email}`;
            } catch (e1) {
              try {
                await prisma.$executeRaw`UPDATE "User" SET is_active = true WHERE email = ${email}`;
              } catch (e2) {
                console.warn('Could not set isActive via raw SQL, ignoring');
              }
            }
            console.log('Raw SQL update applied for user:', email);
          } catch (rawErr) {
            console.error('Raw SQL update failed:', rawErr.message);
          }
        }
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
