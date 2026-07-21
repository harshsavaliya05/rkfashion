import prisma from '../src/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding PostgreSQL database with default data...');

  // 1. Seed Users
  const adminPassword = await bcrypt.hash('harsh@511', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'vasu.admin@rkfashion.com' },
    update: {},
    create: {
      name: 'Vasu Togadiya',
      email: 'vasu.admin@rkfashion.com',
      password: adminPassword,
      role: 'admin',
      status: 'active',
      joined: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    }
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'rahul.sharma@gmail.com' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@gmail.com',
      password: userPassword,
      role: 'customer',
      status: 'active',
      joined: '15 Jan 2026',
      phone: '+91 9824429153',
      addresses: [
        {
          firstName: 'Rahul',
          lastName: 'Sharma',
          flatNo: 'B-304, Regent Square',
          areaName: 'Vesu Main Road',
          landmark: 'Regent Mall',
          city: 'Surat',
          state: 'Gujarat',
          postcode: '395007',
          phone: '9824429153',
          addressType: 'home',
          isDefault: true
        }
      ]
    }
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'anjali.verma@yahoo.com' },
    update: {},
    create: {
      name: 'Anjali Verma',
      email: 'anjali.verma@yahoo.com',
      password: userPassword,
      role: 'customer',
      status: 'blocked',
      joined: '10 Mar 2026',
      phone: '+91 8888877777',
      addresses: [
        {
          firstName: 'Anjali',
          lastName: 'Verma',
          flatNo: 'Flat 12B, Maple Leaves',
          areaName: 'Koregaon Park',
          landmark: 'German Bakery',
          city: 'Pune',
          state: 'Maharashtra',
          postcode: '411001',
          phone: '8888877777',
          addressType: 'home',
          isDefault: true
        }
      ]
    }
  });

  // 2. Seed Products
  const products = [
    {
      name: 'Pique Polo T-Shirt',
      price: 999,
      originalPrice: 1499,
      discountPercent: 33,
      offers: ['Buy 2 Get 10% Off', 'Flat ₹100 Off with FIRSTBUY'],
      image: '/img/product/product-1.jpg',
      images: ['/img/product/product-1.jpg', '/img/product/product-1.jpg'],
      label: 'Sale',
      rating: 5,
      description: 'Upgrade your smart-casual look with our classic Pique Polo T-shirt. Made from 100% breathable organic combed cotton, it features a ribbed collar, two-button placket, and short sleeves. Designed for comfortable everyday wear.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [
        { name: 'Black', class: 'black', hex: '#111111', image: '/img/product/product-1.jpg' },
        { name: 'Blue', class: 'blue', hex: '#1d3557', image: '/img/product/product-1.jpg' }
      ],
      category: 'T-shirt',
      sku: 'RK-PCS-001',
      status: 'published'
    },
    {
      name: 'Slim Fit Stretch Denim Jeans',
      price: 1999,
      originalPrice: 2499,
      discountPercent: 20,
      offers: ['Free Shipping', 'No Cost EMI'],
      image: '/img/product/product-2.jpg',
      images: ['/img/product/product-2.jpg'],
      label: 'New',
      rating: 4,
      description: 'Crafted from premium vintage-washed denim with a touch of stretch, these slim-fit jeans offer both structure and flexibility. Classic five-pocket styling, zip fly, and button closure.',
      sizes: ['30', '32', '34', '36'],
      colors: [
        { name: 'Dark Blue Denim', class: 'blue', hex: '#1d3557', image: '/img/product/product-2.jpg' }
      ],
      category: 'Jeans',
      sku: 'RK-SFD-002',
      status: 'published'
    },
    {
      name: 'Premium Cotton Solid Shirt',
      price: 1299,
      originalPrice: 1799,
      discountPercent: 27,
      offers: ['Flat ₹100 Off with FIRSTBUY'],
      image: '/img/product/product-3.jpg',
      images: ['/img/product/product-3.jpg'],
      label: 'Best Seller',
      rating: 5,
      description: 'Our signature solid shirt is tailored for a clean, regular fit. Made from pre-washed poplin cotton, it features a button-down collar, structured cuffs, and a curved hem. Looks great tucked or untucked.',
      sizes: ['M', 'L', 'XL'],
      colors: [
        { name: 'White', class: 'white', hex: '#f0f0f0', image: '/img/product/product-3.jpg' }
      ],
      category: 'Shirt',
      sku: 'RK-PCS-003',
      status: 'published'
    },
    {
      name: 'Relaxed Fit Fleece Hoodie',
      price: 2499,
      originalPrice: 2999,
      discountPercent: 16,
      offers: ['10% Cashback on UPI payments'],
      image: '/img/product/product-4.jpg',
      images: ['/img/product/product-4.jpg'],
      label: 'Hot',
      rating: 4,
      description: 'Stay cozy in this relaxed-fit hoodie made from super-soft heavyweight fleece. Features a double-lined drawstring hood, kangaroo pocket, and ribbed cuffs. Perfect for chilly evenings.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [
        { name: 'Grey', class: 'grey', hex: '#8d99ae', image: '/img/product/product-4.jpg' }
      ],
      category: 'Hoodie',
      sku: 'RK-RFH-004',
      status: 'published'
    },
    {
      name: 'Vintage Washed Cotton Pants',
      price: 1499,
      originalPrice: 1999,
      discountPercent: 25,
      offers: ['Flat 15% OFF on credit cards'],
      image: '/img/product/product-5.jpg',
      images: ['/img/product/product-5.jpg'],
      label: 'Sale',
      rating: 5,
      description: 'Relaxed cotton trousers garment-dyed for a vintage, soft look. Features slant front pockets, welt back pockets, and flat-front design. Durable and easy to pair with shirts or tees.',
      sizes: ['30', '32', '34'],
      colors: [
        { name: 'Khaki', class: 'khaki', hex: '#ddb892', image: '/img/product/product-5.jpg' }
      ],
      category: 'Cotton Pant',
      sku: 'RK-VCP-005',
      status: 'published'
    },
    {
      name: 'Classic Plain Solid Tee',
      price: 699,
      originalPrice: 999,
      discountPercent: 30,
      offers: ['Buy 3 Get 1 Free'],
      image: '/img/product/product-6.jpg',
      images: ['/img/product/product-6.jpg'],
      label: 'Sale',
      rating: 4,
      description: 'A daily essential solid tee crafted from soft, ringspun combed cotton. Crew neck, short sleeves, and standard fit. Built to retain shape and softness wash after wash.',
      sizes: ['S', 'M', 'L'],
      colors: [
        { name: 'Black', class: 'black', hex: '#111111', image: '/img/product/product-6.jpg' }
      ],
      category: 'T-shirt',
      sku: 'RK-CPST-006',
      status: 'published'
    },
    {
      name: 'Utility Relaxed Cargo Pants',
      price: 2199,
      originalPrice: 2799,
      discountPercent: 21,
      offers: ['Free Shipping'],
      image: '/img/product/product-7.jpg',
      images: ['/img/product/product-7.jpg'],
      label: 'New',
      rating: 5,
      description: 'Heavy utility cargos built for movement. Made from durable cotton ripstop with six-pocket layouts (two flap cargo pockets, front side pockets, and button back pockets). Relaxed leg profiles.',
      sizes: ['30', '32', '34', '36'],
      colors: [
        { name: 'Green', class: 'green', hex: '#2d6a4f', image: '/img/product/product-7.jpg' }
      ],
      category: 'Pant',
      sku: 'RK-URCP-007',
      status: 'published'
    },
    {
      name: 'Checkered Casual Cotton Shirt',
      price: 1599,
      originalPrice: 1999,
      discountPercent: 20,
      offers: ['Flat ₹100 Off with FIRSTBUY'],
      image: '/img/product/product-8.jpg',
      images: ['/img/product/product-8.jpg'],
      label: 'Trend',
      rating: 4,
      description: 'Check pattern casual shirt in rich flannel cotton. Brushed for softness, features twin button chest pockets, point collar, and adjustable cuffs. Perfect for layering over graphic tees.',
      sizes: ['M', 'L', 'XL', '2XL'],
      colors: [
        { name: 'Red', class: 'red', hex: '#c1121f', image: '/img/product/product-8.jpg' }
      ],
      category: 'Shirt',
      sku: 'RK-CCCS-008',
      status: 'published'
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p
    });
  }

  // 3. Seed Banners
  const banners = [
    {
      title: 'SHIRTS & TEES',
      subtitleTag: 'EXCLUSIVELY FOR MEN',
      description: 'Discover our premium collection of cotton linen shirts and everyday solid t-shirts. Designed for effortless luxury.',
      seasonLabel: 'LATEST COLLECTION 2026',
      btnText: 'SHOP COLLECTION',
      link: '/shop',
      imageUrl: 'assets/img/hero/hero-1.jpg',
      active: true
    },
    {
      title: 'JEANS & CARGOS',
      subtitleTag: 'PREMIUM STYLES',
      description: 'Find your perfect fit. Handcrafted vintage-washed denims and relaxed utility cargos made for everyday movement.',
      seasonLabel: 'NEW SEASON ARRIVALS',
      btnText: 'SHOP PANTS & JEANS',
      link: '/shop',
      imageUrl: 'assets/img/hero/hero-2.jpg',
      active: true
    },
    {
      title: 'PREMIUM HOODIES',
      subtitleTag: 'SEASONAL FAVOURITES',
      description: 'Stay warm in high-density combed cotton hoodies and cozy neutral-colored sweatshirts designed for supreme comfort.',
      seasonLabel: 'LIMITED DROPS ONLY',
      btnText: 'EXPLORE HOODIES',
      link: '/shop',
      imageUrl: 'assets/img/hero/hero-3.jpg',
      active: true
    }
  ];

  for (const b of banners) {
    await prisma.banner.create({ data: b });
  }

  // 4. Seed Coupons
  const coupons = [
    {
      code: 'FIRSTBUY',
      discountType: 'flat',
      discountValue: 100,
      minCartValue: 0,
      description: 'Flat ₹100 OFF on your first purchase'
    },
    {
      code: 'FESTIVE20',
      discountType: 'percentage',
      discountValue: 20,
      minCartValue: 1500,
      maxDiscount: 500,
      description: '20% OFF up to ₹500 on orders above ₹1500'
    }
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c
    });
  }

  // 5. Seed Blogs
  const blogs = [
    {
      title: 'What Wearing Your Favorite Color Says About Your Mood',
      author: 'Alessandro Michele',
      date: '16 February 2026',
      imageUrl: 'assets/img/blog/blog-1.jpg',
      category: 'Fashion',
      content: 'Colors speak louder than words. Everyday choices in what color shirt or trousers you wear can communicate subtle messages about your feelings, confidence levels, and current mindset to the world.\n\nBlue represents tranquility and intelligence, white shows neatness and organization, and red stands for high energy and confidence. Learn to align your fashion choice with your mood.',
      quote: 'Colors, like features, follow the changes of the emotions.',
      quoteAuthor: 'Pablo Picasso',
      tags: ['Fashion', 'Color', 'Mood']
    },
    {
      title: 'Eternity Bands Do Last Forever',
      author: 'Aiden Blair',
      date: '21 February 2026',
      imageUrl: 'assets/img/blog/blog-2.jpg',
      category: 'Fashion',
      content: "Eternity bands are the ultimate symbol of eternal love. Typically featuring a continuous line of identically cut gemstones (usually diamonds), these rings are gifted on major milestones like anniversaries or births.\n\nChoosing an eternity band requires careful attention to the setting style (channel, prong, or bezel) and the quality of the diamonds. Since the stones go all the way around, correct sizing is crucial as these rings cannot easily be resized.",
      quote: "Love is not about how many days, months, or years you've been together. It's about how much you love each other every single day.",
      quoteAuthor: 'Emily Rose',
      tags: ['Jewelry', 'Wedding', 'Gift']
    },
    {
      title: 'The Health Benefits Of Sunglasses',
      author: 'Deercreative',
      date: '28 February 2026',
      imageUrl: 'assets/img/blog/blog-3.jpg',
      category: 'Accessories',
      content: 'Sunglasses are much more than a fashion statement. While they certainly complete a stylish look, their primary function is to protect your eyes from harmful ultraviolet (UV) radiation.\n\nExtended exposure to UV rays can lead to serious eye conditions, including cataracts and macular degeneration. High-quality sunglasses block 100% of both UVA and UVB rays, reducing glare and preventing eye strain when outdoors.',
      quote: 'Your vision will become clear only when you look into your heart.',
      quoteAuthor: 'Carl Jung',
      tags: ['Health', 'Accessories', 'Sun']
    }
  ];

  for (const bl of blogs) {
    await prisma.blog.create({ data: bl });
  }

  // 6. Seed Reviews
  const reviews = [
    {
      customer: 'Rahul Sharma',
      email: 'rahul.sharma@gmail.com',
      productId: 1,
      productName: 'Pique Polo T-Shirt',
      rating: 5,
      text: 'Extremely high quality fabric. Fits perfectly on shoulders and length is just right. Color holds up well even after multiple machine washes. Strongly recommended!',
      date: '02 July 2026',
      helpful: 4,
      status: 'approved'
    },
    {
      customer: 'Aniket Gupta',
      email: 'aniket@gmail.com',
      productId: 1,
      productName: 'Pique Polo T-Shirt',
      rating: 4,
      text: 'Good fabric feel, very breathable cotton. Delivery took 4 days to Surat which was slightly long, but product is superb.',
      date: '05 July 2026',
      helpful: 2,
      status: 'approved'
    }
  ];

  for (const r of reviews) {
    await prisma.review.create({ data: r });
  }

  // 7. Seed System Settings
  await prisma.settings.upsert({
    where: { key: 'general' },
    update: {},
    create: {
      key: 'general',
      value: {
        storeName: 'RK Fashion',
        supportPhone: '+91 9824429153',
        supportEmail: 'support@rkfashion.com',
        currency: 'INR',
        address: 'B-304, Regent Square, Vesu Main Road, Surat, Gujarat - 395007'
      }
    }
  });

  await prisma.settings.upsert({
    where: { key: 'payments' },
    update: {},
    create: {
      key: 'payments',
      value: {
        codActive: true,
        razorpayActive: false,
        razorpayKeyId: '',
        razorpaySecretKey: '',
        razorpayMode: 'test',
        cashfreeActive: false,
        cashfreeAppId: '',
        cashfreeSecretKey: '',
        cashfreeMode: 'test'
      }
    }
  });

  await prisma.settings.upsert({
    where: { key: 'shipping' },
    update: {},
    create: {
      key: 'shipping',
      value: {
        flatRate: 99,
        freeThreshold: 1999,
        estMetro: '2 to 4 Working Days',
        estNonMetro: '5 to 7 Working Days'
      }
    }
  });

  await prisma.settings.upsert({
    where: { key: 'admin_profile' },
    update: {},
    create: {
      key: 'admin_profile',
      value: {
        name: 'Vasu Togadiya',
        username: 'vasutogadiya',
        email: 'vasu@rkfashion.com',
        phone: '+91 9824429153',
        joined: '01 Oct 2025',
        lastLogin: '07 July 2026, 02:15 PM'
      }
    }
  });

  // 8. Seed Contact Messages
  const contactMessages = [
    {
      name: 'Amit Kumar',
      email: 'amit.kumar@gmail.com',
      phone: '9876543210',
      subject: 'Inquiry regarding bulk corporate order',
      message: 'Hello, we are planning to order 120 shirts with custom brand embroidery for our company event. Can you share prices and discount timelines? Thanks.',
      date: '06 Jul 2026, 04:30 PM',
      status: 'unread'
    },
    {
      name: 'Priya Verma',
      email: 'priya.verma@yahoo.com',
      phone: '8888877777',
      subject: 'Replacement query for order RK-592813',
      message: 'I received the Premium Cotton Solid Shirt yesterday. Sizing M is slightly tight for me. I want to replace it with L size. Please initiate exchange.',
      date: '05 Jul 2026, 11:15 AM',
      status: 'unread'
    }
  ];

  for (const cm of contactMessages) {
    await prisma.contactMessage.create({ data: cm });
  }

  console.log('PostgreSQL database seeded successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error seeding database:', err);
  prisma.$disconnect();
});
