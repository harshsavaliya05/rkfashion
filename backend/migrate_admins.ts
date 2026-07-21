import prisma from './src/prisma';

async function main() {
  console.log('Fetching users with non-Customer roles...');
  const adminUsers = await prisma.user.findMany({
    where: {
      role: {
        not: 'Customer'
      }
    }
  });

  if (adminUsers.length === 0) {
    console.log('No admins found in the User table.');
    return;
  }

  console.log(`Found ${adminUsers.length} admins. Migrating to AdminProfile...`);

  for (const user of adminUsers) {
    // Check if already migrated
    const exists = await prisma.adminProfile.findUnique({
      where: { email: user.email }
    });

    if (!exists) {
      await prisma.adminProfile.create({
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
          phone: user.phone,
          role: user.role,
          joined: user.joined,
          status: user.status
        }
      });
      console.log(`Migrated admin: ${user.email}`);
    } else {
      console.log(`Admin ${user.email} already exists in AdminProfile. Skipping.`);
    }

    // After migrating, optionally remove them from the User table
    // Uncomment this if you want to cleanly remove them
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log('Migration complete!');
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
