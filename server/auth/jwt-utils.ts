import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';

// JWT secret - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  id: string;
  username: string;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    role: user.role as 'user' | 'admin',
    status: user.status as 'pending' | 'approved' | 'rejected'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'sarvatra-ai',
    audience: 'sarvatra-ai-users'
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'sarvatra-ai',
      audience: 'sarvatra-ai-users'
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof jwt.JsonWebTokenError ? error.message : error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const matches = authHeader.match(/^Bearer\s+(.+)$/);
  return matches ? matches[1] : null;
}