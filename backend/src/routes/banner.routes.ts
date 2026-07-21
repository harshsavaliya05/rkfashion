import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all banners
router.get('/', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany();
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Add a banner
router.post('/', async (req, res) => {
  try {
    const { title, subtitleTag, description, seasonLabel, btnText, link, imageUrl, videoUrl, active } = req.body;
    const newBanner = await prisma.banner.create({
      data: {
        title,
        subtitleTag,
        description,
        seasonLabel,
        btnText,
        link: link || '#',
        imageUrl,
        videoUrl: videoUrl || null,
        active: active !== undefined ? Boolean(active) : true
      }
    });
    res.status(201).json(newBanner);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

// Update a banner
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    const { title, subtitleTag, description, seasonLabel, btnText, link, imageUrl, videoUrl, active } = req.body;

    // Build update data dynamically
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (subtitleTag !== undefined) data.subtitleTag = subtitleTag;
    if (description !== undefined) data.description = description;
    if (seasonLabel !== undefined) data.seasonLabel = seasonLabel;
    if (btnText !== undefined) data.btnText = btnText;
    if (link !== undefined) data.link = link || '#';
    if (imageUrl !== undefined) data.imageUrl = imageUrl || '';
    if (videoUrl !== undefined) data.videoUrl = videoUrl || null;
    if (active !== undefined) data.active = Boolean(active);

    const updated = await prisma.banner.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating banner — full error:', JSON.stringify(error, null, 2));
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    res.status(500).json({ error: error?.message || 'Failed to update banner' });
  }
});



// Delete a banner
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.banner.delete({ where: { id } });
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

export default router;
