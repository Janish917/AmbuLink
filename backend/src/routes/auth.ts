import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev';

router.post('/login', async (req, res) => {
  try {
    const { role, id, password } = req.body;

    if (!role || !id || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find user based on role and ID
    let user;
    if (role === 'DRIVER') {
      user = await prisma.user.findUnique({ where: { driverId: id } });
    } else if (role === 'HOSPITAL') {
      user = await prisma.user.findUnique({ where: { hospitalId: id } });
    } else if (role === 'POLICE') {
      user = await prisma.user.findUnique({ where: { policeId: id } });
    } else {
      return res.status(400).json({ error: 'Invalid role type' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check Verification Status
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Account pending verification by Hospital Administration' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Set HTTP-Only Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { role, id, name, password, nonce } = req.body;
    
    // 1. Verify the Hospital Nonce
    const requiredNonce = process.env.HOSPITAL_NONCE || 'SAPS-AUTH-2026';
    if (nonce !== requiredNonce) {
      return res.status(403).json({ error: 'Invalid Authority Nonce. Registration rejected.' });
    }

    if (!role || !id || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Check if user ID already exists
    let existingUser;
    if (role === 'DRIVER') {
      existingUser = await prisma.user.findUnique({ where: { driverId: id } });
    } else if (role === 'HOSPITAL') {
      existingUser = await prisma.user.findUnique({ where: { hospitalId: id } });
    } else if (role === 'POLICE') {
      existingUser = await prisma.user.findUnique({ where: { policeId: id } });
    }

    if (existingUser) {
      return res.status(409).json({ error: 'ID already registered in the system' });
    }

    // 3. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create User
    const newUser = await prisma.user.create({
      data: {
        name,
        role,
        passwordHash,
        driverId: role === 'DRIVER' ? id : null,
        hospitalId: role === 'HOSPITAL' ? id : null,
        policeId: role === 'POLICE' ? id : null,
        email: `${id.toLowerCase()}@ambulink.system` // Mock email for now
      }
    });

    res.status(201).json({ message: 'Registration successful', userId: newUser.id });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    res.json({
      id: user.id,
      role: user.role,
      name: user.name,
      isVerified: user.isVerified
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Admin Route: Get Pending Registrations
router.get('/pending', async (req, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { isVerified: false },
      select: { id: true, name: true, role: true, driverId: true, hospitalId: true, policeId: true, createdAt: true }
    });
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending accounts' });
  }
});

// Admin Route: Verify an Account
router.post('/verify', async (req, res) => {
  try {
    const { targetUserId } = req.body;
    await prisma.user.update({
      where: { id: targetUserId },
      data: { isVerified: true }
    });
    res.json({ message: 'User successfully verified' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Admin Route: Create Pre-Verified Authority
router.post('/create-authority', async (req, res) => {
  try {
    const { role, id, name, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.user.create({
      data: {
        name,
        role,
        passwordHash,
        driverId: role === 'DRIVER' ? id : null,
        hospitalId: role === 'HOSPITAL' ? id : null,
        policeId: role === 'POLICE' ? id : null,
        email: `${id.toLowerCase()}@ambulink.system`,
        isVerified: true // Pre-verified because created by Admin
      }
    });
    res.status(201).json({ message: 'Authority created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create authority' });
  }
});

// Forgot Password - Generate OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { role, id } = req.body;
    let user;
    if (role === 'DRIVER') {
      user = await prisma.user.findUnique({ where: { driverId: id } });
    } else if (role === 'HOSPITAL') {
      user = await prisma.user.findUnique({ where: { hospitalId: id } });
    } else if (role === 'POLICE') {
      user = await prisma.user.findUnique({ where: { policeId: id } });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiry: expiry }
    });

    // In a real app, send this via email/SMS. For MVP, we return it in response.
    res.json({ message: 'OTP generated', otp }); 
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate OTP' });
  }
});

// Reset Password - Verify OTP & Update
router.post('/reset-password', async (req, res) => {
  try {
    const { role, id, otp, newPassword } = req.body;
    let user;
    if (role === 'DRIVER') {
      user = await prisma.user.findUnique({ where: { driverId: id } });
    } else if (role === 'HOSPITAL') {
      user = await prisma.user.findUnique({ where: { hospitalId: id } });
    } else if (role === 'POLICE') {
      user = await prisma.user.findUnique({ where: { policeId: id } });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, otpCode: null, otpExpiry: null }
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
