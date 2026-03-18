import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total users found:', users.length);
  const data = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive
  }));
  fs.writeFileSync('users_debug.json', JSON.stringify(data, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
