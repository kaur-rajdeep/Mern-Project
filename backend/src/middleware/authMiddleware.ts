import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { UserType } from '../constants/roles';
import { AUTH_CONFIG } from '../config/auth';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
  userType?: UserType;
  customerScopeId?: string; // Resolved parent/customer context
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query && req.query.token) {
      token = String(req.query.token);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET, {
      algorithms: [AUTH_CONFIG.JWT_ALGORITHM],
    }) as { id: string; userType: number };

    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Invalid or deactivated user account.' });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    req.userType = user.userType;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireRole = (allowedRoles: UserType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.userType)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.',
      });
      return;
    }
    next();
  };
};
