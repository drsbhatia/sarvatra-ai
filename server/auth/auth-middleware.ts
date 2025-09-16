import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt-utils';

// Extend Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware - validates JWT token and adds user info to request
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Access denied. Invalid token.' });
  }

  // Check if user account is approved
  if (decoded.status !== 'approved') {
    return res.status(403).json({ 
      error: 'Access denied. Account is not approved.',
      status: decoded.status 
    });
  }

  req.user = decoded;
  next();
}

/**
 * Optional authentication middleware - adds user info if token is valid, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.status === 'approved') {
      req.user = decoded;
    }
  }
  
  next();
}