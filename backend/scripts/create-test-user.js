const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@rdinterlock.com' },
    update: { password: hashedPassword, isActive: true },
    create: {
      name: 'Test Admin',
      email: 'admin@rdinterlock.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('User created/updated:', user.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
