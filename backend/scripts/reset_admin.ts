import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    const email = 'adminrd@interlock.com';
    const password = 'rdadmin';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        isActive: true,
        role: 'ADMIN'
      },
      create: {
        name: 'Admin',
        email,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      },
    });

    console.log('✅ Admin credentials reset successful!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password:', password);
  } catch (error) {
    console.error('❌ Failed to reset admin credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
