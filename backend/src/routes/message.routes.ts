import { Router } from 'express';
import prisma from '../prisma';
import { sendConfirmationEmail } from '../utils/mailer';
import { io } from '../server';

const router = Router();

// Get all messages
router.get('/', async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Submit a message (contact form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, date } = req.body;
    const newMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        date: date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        status: 'unread'
      }
    });

    // Format Token ID to 9 digits (e.g. 000000001) and send confirmation email asynchronously
    const tokenId = String(newMessage.id).padStart(9, '0');
    sendConfirmationEmail(email, name, tokenId).catch((err) => {
      console.error('Error sending confirmation email:', err);
    });

    // Emit real-time event to all connected admin clients
    io.emit('new-message', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to submit message' });
  }
});

// Update a message (mark as read)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: {
        status: status || undefined
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete a message
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.contactMessage.delete({ where: { id } });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
