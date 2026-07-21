import prisma from './src/prisma';

async function main() {
  try {
    await prisma.settings.delete({
      where: { key: 'admin_profile' },
    });
    console.log(`Successfully deleted admin_profile setting`);
  } catch (error) {
    console.log(`Could not delete admin_profile setting. It might already be deleted.`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
