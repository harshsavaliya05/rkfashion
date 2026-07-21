import prisma from './src/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  const adminPassword = await bcrypt.hash('harsh@511', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'harshsavaliya125@gmail.com' },
    update: {
      role: 'admin',
      password: adminPassword,
    },
    create: {
      name: 'Harsh Savaliya',
      email: 'harshsavaliya125@gmail.com',
      password: adminPassword,
      role: 'admin',
      status: 'active',
      joined: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    }
  });

  console.log('Admin created:', admin.email);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
