import prisma from './src/prisma';

async function main() {
  const vasuEmail = 'vasu.admin@rkfashion.com';

  try {
    await prisma.user.delete({
      where: { email: vasuEmail },
    });
    console.log(`Successfully removed ${vasuEmail}`);
  } catch (error) {
    console.log(`Could not remove ${vasuEmail}. It might already be deleted.`);
  }

  try {
    await prisma.user.update({
      where: { email: 'harshsavaliya125@gmail.com' },
      data: { role: 'admin', name: 'Harsh Savaliya (Super Admin)' }
    });
    console.log('Harsh Savaliya is set as super admin.');
  } catch (err) {
    console.log('Error updating Harsh Savaliya', err);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
