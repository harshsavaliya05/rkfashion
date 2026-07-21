import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Add commentsCount to each blog
    const blogsWithCounts = await Promise.all(blogs.map(async (blog) => {
      const commentsCount = await prisma.blogComment.count({
        where: { blogId: blog.id }
      });
      return { ...blog, commentsCount };
    }));
    
    res.json(blogsWithCounts);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get a single blog by ID
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const blog = await prisma.blog.findUnique({ where: { id } });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    
    const commentsCount = await prisma.blogComment.count({
      where: { blogId: id }
    });
    
    res.json({ ...blog, commentsCount });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Add a blog
router.post('/', async (req, res) => {
  try {
    const { title, author, date, imageUrl, category, content, quote, quoteAuthor, tags } = req.body;
    const newBlog = await prisma.blog.create({
      data: {
        title,
        author: author || 'Admin',
        date: date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        imageUrl,
        category,
        content,
        quote,
        quoteAuthor,
        tags: tags || []
      }
    });
    res.status(201).json(newBlog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// Update a blog
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, author, date, imageUrl, category, content, quote, quoteAuthor, tags } = req.body;
    const updated = await prisma.blog.update({
      where: { id },
      data: {
        title,
        author,
        date,
        imageUrl,
        category,
        content,
        quote,
        quoteAuthor,
        tags: tags || undefined
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete a blog
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.blog.delete({ where: { id } });
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

// Get comments for a specific blog
router.get('/:id/comments', async (req, res) => {
  try {
    const blogId = Number(req.params.id);
    const comments = await prisma.blogComment.findMany({
      where: { blogId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching blog comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Post a comment to a specific blog
router.post('/:id/comments', async (req, res) => {
  try {
    const blogId = Number(req.params.id);
    const { name, email, phone, text, date } = req.body;
    const comment = await prisma.blogComment.create({
      data: {
        blogId,
        name,
        email,
        phone: phone || '',
        text,
        date: date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      }
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

export default router;
