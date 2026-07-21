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
  limits: { fileSize: 100 * 1024 * 1024 }, // Max 100MB file size (to allow large videos or images)
  fileFilter: (req: any, file: any, cb: any) => {
    const filetypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov|quicktime/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and videos are allowed'));
  }
});

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Add a category
router.post('/', async (req, res) => {
  try {
    const { name, cursive, title, description, imageUrl, videoUrl, icon } = req.body;
    const newCategory = await prisma.category.create({
      data: {
        name,
        cursive: cursive || '',
        title: title || '',
        description: description || '',
        imageUrl: imageUrl || '',
        videoUrl: videoUrl || '',
        icon: icon || '🛍️'
      }
    });
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, cursive, title, description, imageUrl, videoUrl, icon } = req.body;
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        cursive: cursive !== undefined ? cursive : undefined,
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        videoUrl: videoUrl !== undefined ? videoUrl : undefined,
        icon: icon !== undefined ? icon : undefined
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Category Media Upload (Image or Video)
router.post('/upload', (req: any, res: any) => {
  upload.single('media')(req, res, async (err: any) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(req.file.originalname).toLowerCase();
      
      // Check if it's a video
      if (ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.quicktime') {
        const filename = 'category-' + uniqueSuffix + ext;
        const destPath = path.join(uploadsDir, filename);
        fs.writeFileSync(destPath, req.file.buffer);
        const fileUrl = `http://localhost:3000/uploads/${filename}`;
        return res.json({ videoUrl: fileUrl, imageUrl: '' });
      } else {
        const webpFilename = 'category-' + uniqueSuffix + '.webp';
        const webpPath = path.join(uploadsDir, webpFilename);

        await sharp(req.file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(webpPath);

        const fileUrl = `http://localhost:3000/uploads/${webpFilename}`;
        return res.json({ imageUrl: fileUrl, videoUrl: '' });
      }
    } catch (error: any) {
      console.error('Failed to upload category media:', error);
      res.status(500).json({ error: error.message || 'Failed to upload category media' });
    }
  });
});

export default router;
