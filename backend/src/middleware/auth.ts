import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId?: string;
    firstName: string;
    lastName: string;
  };
}

export const auth = async (
export const authenticate = async (
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured');
      res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
      firstName: user.firstName,
      lastName: user.lastName
    };
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

export const requireOwner = requireRole(['OWNER']);
export const requireAdmin = requireRole(['OWNER', 'ADMIN']);
export const requireUser = requireRole(['OWNER', 'ADMIN', 'USER']);

export const requireSameCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(403).json({
        success: false,
        message: 'User must be associated with a company',
      });
      return;
    }

    // This middleware can be extended to check if the requested resource
    // belongs to the same company as the authenticated user
    next();
  } catch (error) {
    logger.error('Company authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
    });
  }
};
