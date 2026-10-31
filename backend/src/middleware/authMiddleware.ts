import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
  };
}

export const protectAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    let token = '';

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
      token = req.query.token.trim();
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized access. Please log in as administrator.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'student_fee_manager_secret_key_2026_secure';
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name: string;
    };

    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please log in again.',
    });
  }
};
