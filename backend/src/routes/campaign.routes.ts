import { Router } from 'express';
import prisma from '../prisma';
import { sendCampaignEmail } from '../utils/mailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { marked } from 'marked';

// Configure marked to render line breaks properly for email
marked.setOptions({
  breaks: true,
  gfm: true
});

const router = Router();

import sharp from 'sharp';

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage engine configuration
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB file size
  fileFilter: (req: any, file: any, cb: any) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, JPG, PNG, GIF, WEBP) are allowed'));
  }
});

// Endpoint to upload a campaign banner image
router.post('/upload', upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const webpFilename = 'campaign-' + uniqueSuffix + '.webp';
    const webpPath = path.join(uploadsDir, webpFilename);

    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // Auto-resize large images to max 1200px width
      .webp({ quality: 80 })
      .toFile(webpPath);

    const fileUrl = `http://localhost:3000/uploads/${webpFilename}`;
    res.json({ imageUrl: fileUrl });
  } catch (error: any) {
    console.error('Error uploading campaign image:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Send a promotional campaign email to all active customers
router.post('/send', async (req, res) => {
  try {
    const { subject, title, description, buttonText, discountPercent, imageUrl } = req.body;

    if (!subject || !title || !description) {
      return res.status(400).json({ error: 'Subject, Title, and Description are required' });
    }

    // Parse markdown description into HTML
    const parsedDescriptionHTML = await marked.parse(description);

    // Fetch all customers who are not blocked and have 'Customer' role
    const customers = await prisma.user.findMany({
      where: {
        role: 'Customer',
        status: 'active'
      }
    });

    if (customers.length === 0) {
      return res.status(404).json({ error: 'No active customers found to send emails' });
    }

    // Check if there is a local upload image to embed as inline CID attachment
    let mailAttachments: any[] = [];
    let imageSrc = imageUrl;
    
    if (imageUrl && imageUrl.includes('/uploads/')) {
      const filename = imageUrl.split('/uploads/')[1];
      const localFilePath = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(localFilePath)) {
        mailAttachments.push({
          filename: filename,
          path: localFilePath,
          cid: 'campaignBanner'
        });
        imageSrc = 'cid:campaignBanner';
      }
    }

    // Process sending in batches of 50 to prevent memory overhead and SMTP server throttling
    const batchSize = 50;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(customer => {
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #fcfcfc;">
              <div style="text-align: center; border-bottom: 2px solid #3d4f35; padding-bottom: 15px; margin-bottom: 20px;">
                <h1 style="color: #3d4f35; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800; text-transform: uppercase;">RK FASHION</h1>
              </div>
              ${imageSrc ? `
              <div style="width: 100%; overflow: hidden; border-radius: 4px; margin-bottom: 20px;">
                <img src="${imageSrc}" alt="RK Fashion Promo" style="width: 100%; height: auto; display: block;" />
              </div>
              ` : ''}
              <h2 style="color: #111111; font-size: 22px; font-weight: 700; margin-bottom: 15px; text-transform: uppercase; text-align: center;">${title}</h2>
              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Hi <strong>${customer.name}</strong>,</p>
              <div style="color: #555555; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">${parsedDescriptionHTML}</div>
              
              ${discountPercent ? `
              <div style="background-color: #e6f9ed; border: 1px dashed #10b981; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #10b981; font-weight: 800; display: block; margin-bottom: 5px;">Special Offer</span>
                <strong style="font-size: 32px; color: #10b981; display: block;">${discountPercent}% OFF</strong>
                <span style="font-size: 12px; color: #666; display: block; margin-top: 5px;">Applied to all products on our store!</span>
              </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:4300/" style="background-color: #111111; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; display: inline-block;">
                  ${buttonText || 'Shop Collection'}
                </a>
              </div>
              <div style="text-align: center; color: #64748b; font-size: 11.5px; line-height: 1.5; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-family: Arial, sans-serif;">
                <p style="margin: 0 0 8px;">Enjoy free shipping on orders above ₹999. Easy 7-day return & exchange.</p>
                <p style="font-size: 9.5px; color: #94a3b8; margin: 0;">
                  You are receiving this promotional email because you are a registered customer of RK Fashion.
                </p>
              </div>
            </div>
          `;

          // Catch errors per-email so one invalid address doesn't halt the entire blast campaign
          return sendCampaignEmail(customer.email, customer.name, subject, htmlContent, mailAttachments)
            .catch(err => console.error(`[Campaign Error]: Failed to send to ${customer.email}:`, err));
        })
      );

      // Small pause between batches to prevent spam triggering and connection overflow
      if (i + batchSize < customers.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    res.json({ message: `Announcement email successfully sent to ${customers.length} customers!` });
  } catch (error) {
    console.error('Error sending campaign emails:', error);
    res.status(500).json({ error: 'Failed to send campaign emails' });
  }
});

export default router;
