import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.settings.findMany();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get settings by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const settings = await prisma.settings.findUnique({
      where: { key }
    });
    if (!settings) return res.status(404).json({ error: 'Settings not found' });
    res.json(settings.value);
  } catch (error) {
    console.error(`Error fetching settings for ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Set/Update settings by key
router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    const settings = await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    res.json(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
