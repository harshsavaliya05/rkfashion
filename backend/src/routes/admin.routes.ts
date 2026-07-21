import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET all admins
router.get('/', async (req, res) => {
  try {
    const admins = await prisma.adminProfile.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // Remove passwords before sending to frontend
    const safeAdmins = admins.map(a => {
      const { password, ...safeAdmin } = a;
      return safeAdmin;
    });
    res.status(200).json(safeAdmins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Error fetching admins' });
  }
});

// DELETE admin by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the admin exists
    const admin = await prisma.adminProfile.findUnique({
      where: { id: Number(id) }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Protect master admin from deletion just in case
    if (admin.email === 'harshsavaliya125@gmail.com') {
      return res.status(403).json({ error: 'Cannot delete master system administrator' });
    }

    await prisma.adminProfile.delete({
      where: { id: Number(id) }
    });

    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Error deleting admin' });
  }
});

export default router;
