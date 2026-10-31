import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAdminRecord, findAdminByEmail } from '../services/dataStore';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({
        success: false,
        message: 'Please provide your full name.',
      });
      return;
    }

    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }

    if (!password || String(password).length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const admin = await createAdminRecord({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
    });

    const secret = process.env.JWT_SECRET || 'student_fee_manager_secret_key_2026_secure';
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin account registered successfully.',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
        },
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to register admin',
    });
  }
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.',
      });
      return;
    }

    const admin = await findAdminByEmail(String(email));
    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(String(password), admin.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'student_fee_manager_secret_key_2026_secure';
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Login failed',
    });
  }
};

export const getCurrentAdmin = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  res.json({
    success: true,
    data: req.admin,
  });
};
