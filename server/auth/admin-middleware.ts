import { Request, Response, NextFunction } from 'express';

/**
 * Admin-only authorization middleware 
 * Must be used AFTER authenticateToken middleware
 * Ensures only users with admin role can access protected routes
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated (should be set by authenticateToken middleware)
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Authentication required.' });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.',
      userRole: req.user.role 
    });
  }

  next();
}

/**
 * Admin or self authorization middleware
 * Allows access if user is admin OR accessing their own data
 * userIdParam is the parameter name that contains the user ID (e.g., 'id' for /users/:id)
 */
export function requireAdminOrSelf(userIdParam: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Authentication required.' });
    }

    const targetUserId = req.params[userIdParam];
    
    // Allow if user is admin OR accessing their own data
    if (req.user.role === 'admin' || req.user.id === targetUserId) {
      next();
    } else {
      res.status(403).json({ 
        error: 'Access denied. Admin privileges or self-access required.',
        userRole: req.user.role 
      });
    }
  };
}