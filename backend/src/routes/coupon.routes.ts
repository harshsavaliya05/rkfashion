import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all coupons
router.get('/', async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany();
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Add a coupon
router.post('/', async (req, res) => {
  try {
    const { code, discountType, discountValue, minCartValue, maxDiscount, description, expiryDays } = req.body;
    const newCoupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue: Number(discountValue),
        minCartValue: minCartValue !== undefined ? Number(minCartValue) : 0,
        maxDiscount: maxDiscount !== undefined && maxDiscount !== null ? Number(maxDiscount) : null,
        description,
        expiryDays: expiryDays === null ? null : (expiryDays !== undefined ? Number(expiryDays) : null)
      }
    });
    res.status(201).json(newCoupon);
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// Update a coupon
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { code, discountType, discountValue, minCartValue, maxDiscount, description, expiryDays } = req.body;
    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        code,
        discountType,
        discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
        minCartValue: minCartValue !== undefined ? Number(minCartValue) : undefined,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount !== null ? Number(maxDiscount) : null) : undefined,
        description,
        expiryDays: expiryDays === null ? null : (expiryDays !== undefined ? Number(expiryDays) : undefined)
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Delete a coupon
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.coupon.delete({ where: { id } });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

export default router;
