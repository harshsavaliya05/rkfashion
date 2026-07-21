import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product by id:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const {
      name,
      price,
      originalPrice,
      discountPercent,
      offers,
      image,
      images,
      label,
      rating,
      description,
      sizes,
      colors,
      category,
      sku,
      status,
      highlights,
      variants
    } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        discountPercent: discountPercent ? Number(discountPercent) : null,
        offers: offers || [],
        image,
        images: images || [],
        label: label || null,
        rating: rating ? Number(rating) : 0,
        description,
        sizes: sizes || [],
        colors: colors || [],
        category,
        sku,
        status: status || 'published',
        highlights: highlights || [],
        variants: variants || []
      },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      originalPrice,
      discountPercent,
      offers,
      image,
      images,
      label,
      rating,
      description,
      sizes,
      colors,
      category,
      sku,
      status,
      highlights,
      variants
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: name !== undefined ? name : existing.name,
        price: price !== undefined ? Number(price) : existing.price,
        originalPrice: originalPrice !== undefined ? (originalPrice ? Number(originalPrice) : null) : existing.originalPrice,
        discountPercent: discountPercent !== undefined ? (discountPercent ? Number(discountPercent) : null) : existing.discountPercent,
        offers: offers !== undefined ? offers : existing.offers,
        image: image !== undefined ? image : existing.image,
        images: images !== undefined ? images : existing.images,
        label: label !== undefined ? label : existing.label,
        rating: rating !== undefined ? (rating ? Number(rating) : 0) : existing.rating,
        description: description !== undefined ? description : existing.description,
        sizes: sizes !== undefined ? sizes : existing.sizes,
        colors: colors !== undefined ? colors : existing.colors,
        category: category !== undefined ? category : existing.category,
        sku: sku !== undefined ? sku : existing.sku,
        status: status !== undefined ? status : existing.status,
        highlights: highlights !== undefined ? highlights : existing.highlights,
        variants: variants !== undefined ? variants : existing.variants
      },
    });
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
