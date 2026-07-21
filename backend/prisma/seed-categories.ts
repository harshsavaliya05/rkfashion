import prisma from '../src/prisma';

const defaultCategories = [
  {
    name: 'T-shirt',
    title: 'Modern T-Shirts',
    cursive: 'Casuals',
    videoUrl: '/videos/tshirts.mp4',
    icon: '👕',
    description: 'Ultra-soft daily essentials featuring clean crewnecks and sophisticated drapes.'
  },
  {
    name: 'Shirt',
    title: 'Luxury Shirts',
    cursive: 'Linen & Cotton',
    videoUrl: '/videos/shirts.mp4',
    icon: '👔',
    description: 'Light, breathable, and sharp. Tailored to perfection for every occasion.'
  },
  {
    name: 'Hoodie',
    title: 'Cozy Hoodies',
    cursive: 'Streetwear',
    videoUrl: '/videos/hoodies.mp4',
    icon: '🧥',
    description: 'Heavyweight fleece hoodies designed to keep you warm and stylish.'
  },
  {
    name: 'Jeans',
    title: 'Premium Jeans',
    cursive: 'Denim',
    videoUrl: '/videos/jeans.mp4',
    icon: '👖',
    description: 'Crafted with premium cotton and wash textures for an absolute classic fit.'
  },
  {
    name: 'Pant',
    title: 'Cargo Trousers',
    cursive: 'Utility',
    videoUrl: '/videos/cargos.mp4',
    icon: '🏕️',
    description: 'Structured pockets and relaxed fits, combining tactical comfort with styling.'
  },
  {
    name: 'Cotton Pant',
    title: 'Classic Pants',
    cursive: 'Tailored',
    videoUrl: '/videos/pants.mp4',
    icon: '👔',
    description: 'Sophisticated chinos and trousers tailored for clean profiles and comfort.'
  }
];

async function main() {
  console.log('Seeding categories...');
  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }
  console.log('Categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
