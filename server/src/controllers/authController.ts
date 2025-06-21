import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { config } from '../config';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw createError('User with this email already exists', 409);
  }

  // Create new user
  const user = await UserModel.create(email, password, name);

  // Generate token
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  logger.info('User registered successfully', { userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
      expires_in: config.jwt.expiresIn,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Verify password
  const isPasswordValid = await UserModel.verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Generate token
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
      expires_in: config.jwt.expiresIn,
    },
  });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = await UserModel.findById(req.user!.id);
  
  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: user,
  });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name, email } = req.body;
  const userId = req.user!.id;

  // Check if email is being changed and if it's already taken
  if (email && email !== req.user!.email) {
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      throw createError('Email is already in use', 409);
    }
  }

  const updatedUser = await UserModel.update(userId, { name, email });
  
  if (!updatedUser) {
    throw createError('Failed to update profile', 500);
  }

  logger.info('User profile updated', { userId, changes: { name, email } });

  res.json({
    success: true,
    data: updatedUser,
  });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  // Get user with password hash
  const user = await UserModel.findByEmail(req.user!.email);
  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await UserModel.verifyPassword(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw createError('Current password is incorrect', 401);
  }

  // Update password
  const success = await UserModel.updatePassword(userId, newPassword);
  if (!success) {
    throw createError('Failed to update password', 500);
  }

  logger.info('User password changed', { userId });

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});

export const deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user!.id;

  const success = await UserModel.delete(userId);
  if (!success) {
    throw createError('Failed to delete account', 500);
  }

  logger.info('User account deleted', { userId });

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});