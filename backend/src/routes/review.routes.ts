import { Router } from 'express';
import prisma from '../prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB per file
  fileFilter: (req: any, file: any, cb: any) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  }
});

// Get all reviews (for admin)
router.get('/', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get approved reviews for a specific product
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const reviews = await prisma.review.findMany({
      where: {
        productId
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ error: 'Failed to fetch product reviews' });
  }
});

// Submit a new review
router.post('/', async (req, res) => {
  try {
    const { customer, email, productId, productName, rating, text, date, photos } = req.body;
    const targetProductId = Number(productId);

    // Verify user has purchased and received this product
    const userOrders = await prisma.order.findMany({
      where: {
        userEmail: email,
        status: 'Delivered'
      }
    });

    let hasPurchased = false;
    for (const order of userOrders) {
      const items = order.items as any[];
      if (items && items.some((item: any) => item.productId === targetProductId)) {
        hasPurchased = true;
        break;
      }
    }

    if (!hasPurchased) {
      return res.status(403).json({ error: 'You can only write a review for products you have purchased and received.' });
    }

    const newReview = await prisma.review.create({
      data: {
        customer,
        email,
        productId: targetProductId,
        productName,
        rating: Number(rating),
        text,
        date,
        helpful: 0,
        photos: photos || [],
        status: 'approved' // auto-approve all reviews
      }
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Upload photos for a review
router.post('/upload', (req: any, res: any) => {
  upload.array('photos', 5)(req, res, async (err: any) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.json({ urls: [] });
      }

      const urls: string[] = [];
      for (const file of req.files) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const webpFilename = 'review-' + uniqueSuffix + '.webp';
        const webpPath = path.join(uploadsDir, webpFilename);

        await sharp(file.buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(webpPath);

        urls.push(`http://localhost:3000/uploads/${webpFilename}`);
      }

      res.json({ urls });
    } catch (error: any) {
      console.error('Failed to upload review photos:', error);
      res.status(500).json({ error: error.message || 'Failed to upload review photos' });
    }
  });
});
// Mark a review as helpful for a specific user
router.post('/:id/helpful', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const helpfulByUsers = (review.helpfulByUsers as string[]) || [];

    if (helpfulByUsers.includes(email)) {
      return res.status(400).json({ error: 'User already marked this review as helpful' });
    }

    helpfulByUsers.push(email);

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        helpful: review.helpful + 1,
        helpfulByUsers: helpfulByUsers
      }
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error marking review helpful:', error);
    res.status(500).json({ error: 'Failed to mark review helpful' });
  }
});

// Update a review (status, helpful count, etc.)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, helpful } = req.body;

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        status: status !== undefined ? status : undefined,
        helpful: helpful !== undefined ? Number(helpful) : undefined
      }
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.review.delete({ where: { id } });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
