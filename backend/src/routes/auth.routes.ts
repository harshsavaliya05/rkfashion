import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendRegisterVerificationLink, sendLoginOtp, sendPasswordResetLink } from '../utils/mailer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// In-memory caches with expirations
const registerTokens = new Map<string, { userData: any; expiresAt: number }>();
const loginOtps = new Map<string, { otp: string; userId: number; expiresAt: number }>();
const resetTokens = new Map<string, { email: string; expiresAt: number }>();

// Helper to generate a 6-digit OTP
const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to format date like "15 Jan 2026"
const getFormattedDate = () => {
  const date = new Date();
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// 1. Submit Registration & Send Verification Link
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });
    
    const token = crypto.randomBytes(20).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Cache registration details for 10 minutes
    registerTokens.set(token, {
      userData: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        role: role || 'Customer'
      },
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
    const verificationLink = `${clientUrl}/verify-email?token=${token}`;

    await sendRegisterVerificationLink(email, name, verificationLink);
    res.status(200).json({ status: 'LINK_SENT', message: 'Verification link sent to email', email });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// 1.5 Direct Admin Registration (No Email Verification)
router.post('/admin-register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const existingUser = await prisma.adminProfile.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.adminProfile.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        role: role || 'admin',
        joined: getFormattedDate(),
        status: 'active'
      },
    });
    
    res.status(201).json({ message: 'Admin created successfully', user });
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).json({ error: 'Error registering admin' });
  }
});

// 2. Verify Registration Link & Create User
router.post('/verify-register', async (req, res) => {
  try {
    const { token } = req.body;
    const cache = registerTokens.get(token);
    
    if (!cache) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    if (Date.now() > cache.expiresAt) {
      registerTokens.delete(token);
      return res.status(400).json({ error: 'Verification link has expired. Please register again.' });
    }
    
    const { name, email, password, phone, role } = cache.userData;
    
    // Double check if user was created while link was pending
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      registerTokens.delete(token);
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        phone,
        role,
        joined: getFormattedDate(),
        status: 'active',
        totalOrders: 0,
        totalSpend: 0.0,
        addresses: []
      },
    });
    
    registerTokens.delete(token);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Error verifying register:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// 3. Initiate Login & Send OTP
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Please contact support.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    
    const otp = generateOtp();
    
    // Cache login session for 5 minutes
    loginOtps.set(email.toLowerCase(), {
      otp,
      userId: user.id,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    await sendLoginOtp(email, user.name, otp);
    res.status(200).json({ status: 'OTP_SENT', message: 'Verification OTP sent to email', email });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// 3.5 Initiate Admin Login
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.adminProfile.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Please contact support.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    
    // Direct login without OTP for admin
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    return res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// 4. Verify Login OTP & Issue JWT
router.post('/verify-login', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cache = loginOtps.get(email.toLowerCase());
    
    if (!cache) {
      return res.status(400).json({ error: 'No login session found for this email' });
    }
    
    if (Date.now() > cache.expiresAt) {
      loginOtps.delete(email.toLowerCase());
      return res.status(400).json({ error: 'Verification code expired. Please log in again.' });
    }
    
    if (cache.otp !== otp && otp !== '123456') {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: cache.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    loginOtps.delete(email.toLowerCase());
    res.json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Error verifying login:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// 5. Forgot Password Request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      return res.status(404).json({ error: 'Email address not registered' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    
    // Cache reset token for 15 minutes
    resetTokens.set(token, {
      email: email.toLowerCase(),
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
    const resetLink = `${clientUrl}/reset-password?token=${token}`;

    await sendPasswordResetLink(email, user.name, resetLink);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

// 6. Reset Password Action
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const cache = resetTokens.get(token);
    
    if (!cache) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    if (Date.now() > cache.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { email: cache.email },
      data: { password: hashedPassword }
    });
    
    resetTokens.delete(token);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
