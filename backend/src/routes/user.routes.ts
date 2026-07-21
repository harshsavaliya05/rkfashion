import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all users — with computed totalOrders and totalSpend from Orders table
router.get('/', async (req, res) => {
  try {
    const [users, orders] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.order.findMany({ select: { userEmail: true, total: true } })
    ]);

    // Build a lookup map: email → { count, sum }
    const orderStats: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      const email = (o.userEmail || '').toLowerCase();
      if (!orderStats[email]) orderStats[email] = { count: 0, total: 0 };
      orderStats[email].count += 1;
      orderStats[email].total += Number(o.total) || 0;
    }

    // Merge computed stats into user objects
    const enriched = users.map(u => {
      const stats = orderStats[(u.email || '').toLowerCase()] || { count: 0, total: 0 };
      return {
        ...u,
        totalOrders: stats.count,
        totalSpend: stats.total
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user details (status, role, totalOrders, totalSpend, addresses, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      gender,
      dob,
      role,
      status,
      totalOrders,
      totalSpend,
      addresses
    } = req.body;

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        name,
        email,
        phone: phone || null,
        gender: gender || null,
        dob: dob || null,
        role: role || 'Customer',
        status: status || 'active',
        totalOrders: totalOrders !== undefined ? Number(totalOrders) : undefined,
        totalSpend: totalSpend !== undefined ? Number(totalSpend) : undefined,
        addresses: addresses || undefined
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change user password
router.post('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Incorrect old password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: Number(id) },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    
    // Safety check: prevent deletion of system master admin
    const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
    if (userToDelete && userToDelete.email === 'vasu.admin@rkfashion.com') {
      return res.status(400).json({ error: 'Cannot delete system master administrator' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user cart
router.get('/:id/cart', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { cart: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.cart);
  } catch (error) {
    console.error('Error fetching user cart:', error);
    res.status(500).json({ error: 'Failed to fetch user cart' });
  }
});

// Update user cart
router.put('/:id/cart', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { cart } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { cart: cart || [] },
      select: { cart: true }
    });
    res.json(user.cart);
  } catch (error) {
    console.error('Error updating user cart:', error);
    res.status(500).json({ error: 'Failed to update user cart' });
  }
});

// Get user wishlist
router.get('/:id/wishlist', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { wishlist: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.wishlist);
  } catch (error) {
    console.error('Error fetching user wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch user wishlist' });
  }
});

// Update user wishlist
router.put('/:id/wishlist', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { wishlist } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { wishlist: wishlist || [] },
      select: { wishlist: true }
    });
    res.json(user.wishlist);
  } catch (error) {
    console.error('Error updating user wishlist:', error);
    res.status(500).json({ error: 'Failed to update user wishlist' });
  }
});

export default router;
