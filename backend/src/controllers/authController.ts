import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AUTH_CONFIG } from '../config/auth';
import { UserStatus } from '../constants/roles';
import { computeDeviceFingerprint } from '../utils/deviceFingerprint';
import { mailService } from '../services/mailService';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  validate,
} from '../middleware/validateRequest';

export class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate input format
      const validation = validate(loginSchema, req.body);
      if (!validation.ok) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      if (user.status === UserStatus.INACTIVE) {
        res.status(403).json({ success: false, message: 'Your account has been inactive. Please contact administrator.' });
        return;
      }

      if (user.status === UserStatus.DELETE) {
        res.status(403).json({ success: false, message: 'Your account has been deleted.' });
        return;
      }

      // Password verification: checks bcrypt, or legacy MD5 if migrating
      let isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordMatch && user.legacyMd5Hash) {
        const md5Input = crypto.createHash('md5').update(password).digest('hex');
        if (md5Input === user.legacyMd5Hash) {
          isPasswordMatch = true;
          // Upgrade to bcrypt and permanently clear legacy MD5 hash
          user.passwordHash = await bcrypt.hash(password, 10);
          user.legacyMd5Hash = '';
          await user.save();
        }
      }

      if (!isPasswordMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Sign JWT with tokenVersion for session revocation
      const token = jwt.sign(
        {
          id: user._id,
          userType: user.userType,
          email: user.email,
          fullName: user.fullName,
          tokenVersion: user.tokenVersion || 0,
        },
        AUTH_CONFIG.JWT_SECRET,
        {
          expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN as any,
          algorithm: AUTH_CONFIG.JWT_ALGORITHM,
        }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          legacyId: user.legacyId,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          companyName: user.companyName,
          companyNumber: user.companyNumber,
          phoneNumber: user.phoneNumber,
          address: user.address,
          permissions: user.permissions,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'An internal error occurred during login.' });
    }
  }

  public async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          legacyId: user.legacyId,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          companyName: user.companyName,
          companyNumber: user.companyNumber,
          phoneNumber: user.phoneNumber,
          address: user.address,
          permissions: user.permissions,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Validate email format
      const validation = validate(forgotPasswordSchema, req.body);
      if (!validation.ok) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required.' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user || user.status !== UserStatus.ACTIVE) {
        // SEC-009: Anti-enumeration generic response
        res.status(200).json({
          success: true,
          message: 'If an active account is registered with this email, password recovery instructions have been sent.',
        });
        return;
      }

      // Generate high-entropy 16-character temporary password
      const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
      const randomBytes = crypto.randomBytes(16);
      let temporaryPassword = '';
      for (let i = 0; i < 16; i++) {
        temporaryPassword += randomChars[randomBytes[i] % randomChars.length];
      }

      // Dispatch password recovery mail before overwriting account password in database
      // to avoid permanent lockout if mail transport is degraded
      const mailSent = await mailService.sendPasswordResetMail(user.email, user.fullName, temporaryPassword);
      if (!mailSent && process.env.SMTP_USER) {
        res.status(500).json({
          success: false,
          message: 'Password recovery notification service is temporarily unavailable. Please try again later.',
        });
        return;
      }

      user.passwordHash = await bcrypt.hash(temporaryPassword, 10);
      user.legacyMd5Hash = ''; // Purge legacy MD5
      user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate any existing sessions
      await user.save();

      res.status(200).json({
        success: true,
        message: 'If an active account is registered with this email, password recovery instructions have been sent.',
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Failed to process password reset request.' });
    }
  }

  public async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      // Validate new password strength
      const validation = validate(changePasswordSchema, req.body);
      if (!validation.ok) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password does not match.' });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.legacyMd5Hash = '';
      user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
      await user.save();

      res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { fullName, phoneNumber, companyName, companyNumber, address } = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      // Validate profile fields
      const validation = validate(updateProfileSchema, req.body);
      if (!validation.ok) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      if (companyNumber !== undefined && companyNumber.trim() !== '' && companyNumber !== user.companyNumber) {
        const existingCompany = await User.findOne({ companyNumber: companyNumber.trim(), _id: { $ne: user._id } });
        if (existingCompany) {
          res.status(400).json({ success: false, message: 'Company ID is already in use by another organization.' });
          return;
        }
      }

      if (fullName) user.fullName = fullName;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
      if (companyName !== undefined) user.companyName = companyName;
      if (companyNumber !== undefined) user.companyNumber = companyNumber;
      if (address !== undefined) user.address = address;

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          phoneNumber: user.phoneNumber,
          companyName: user.companyName,
          companyNumber: user.companyNumber,
          address: user.address,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const authController = new AuthController();
