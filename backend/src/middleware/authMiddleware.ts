import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isVerified || (user.role === 'DRIVER' && user.verificationStatus !== 'verified')) {
      return res.status(403).json({ error: 'Forbidden: Account is not verified.' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};
