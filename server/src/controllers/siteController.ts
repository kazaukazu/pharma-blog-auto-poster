import { Request, Response, NextFunction } from 'express';
import { WordPressSiteModel } from '../models/WordPressSite';
import { WordPressService } from '../services/wordpressService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const createSite = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const {
    name,
    url,
    username,
    password,
    region,
    pharmacy_name,
    pharmacy_features,
    category_id,
  } = req.body;

  const userId = req.user!.id;

  // Test WordPress connection before saving
  const connectionTest = await WordPressService.testConnection(url, username, password);
  
  if (!connectionTest.success) {
    throw createError(`WordPress connection failed: ${connectionTest.error}`, 400);
  }

  // Create site
  const site = await WordPressSiteModel.create({
    user_id: userId,
    name,
    url,
    username,
    password,
    region,
    pharmacy_name,
    pharmacy_features,
    category_id,
  });

  // Update connection status
  await WordPressSiteModel.updateConnectionStatus(site.id, 'connected');

  logger.info('WordPress site created', { 
    userId, 
    siteId: site.id, 
    siteName: name, 
    url 
  });

  res.status(201).json({
    success: true,
    data: {
      ...site,
      connection_status: 'connected',
      categories: connectionTest.categories,
    },
  });
});

export const getSites = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const sites = await WordPressSiteModel.findByUserId(userId);

  res.json({
    success: true,
    data: sites,
  });
});

export const getSite = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const site = await WordPressSiteModel.findById(id, userId);
  
  if (!site) {
    throw createError('Site not found', 404);
  }

  res.json({
    success: true,
    data: site,
  });
});

export const updateSite = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const updates = req.body;

  // Check if site exists
  const existingSite = await WordPressSiteModel.findById(id, userId);
  if (!existingSite) {
    throw createError('Site not found', 404);
  }

  // If credentials are being updated, test the connection
  if (updates.username || updates.password || updates.url) {
    const siteWithCredentials = await WordPressSiteModel.findByIdWithCredentials(id, userId);
    
    const testUrl = updates.url || siteWithCredentials!.url;
    const testUsername = updates.username || siteWithCredentials!.credentials.username;
    const testPassword = updates.password || siteWithCredentials!.credentials.password;

    const connectionTest = await WordPressService.testConnection(testUrl, testUsername, testPassword);
    
    if (!connectionTest.success) {
      throw createError(`WordPress connection failed: ${connectionTest.error}`, 400);
    }

    // Update connection status
    await WordPressSiteModel.updateConnectionStatus(id, 'connected');
  }

  // Update site
  const updatedSite = await WordPressSiteModel.update(id, userId, updates);
  
  if (!updatedSite) {
    throw createError('Failed to update site', 500);
  }

  logger.info('WordPress site updated', { 
    userId, 
    siteId: id, 
    updates: Object.keys(updates) 
  });

  res.json({
    success: true,
    data: updatedSite,
  });
});

export const deleteSite = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const success = await WordPressSiteModel.delete(id, userId);
  
  if (!success) {
    throw createError('Site not found', 404);
  }

  logger.info('WordPress site deleted', { userId, siteId: id });

  res.json({
    success: true,
    message: 'Site deleted successfully',
  });
});

export const testConnection = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const site = await WordPressSiteModel.findByIdWithCredentials(id, userId);
  
  if (!site) {
    throw createError('Site not found', 404);
  }

  const connectionTest = await WordPressService.testConnection(
    site.url,
    site.credentials.username,
    site.credentials.password
  );

  // Update connection status
  await WordPressSiteModel.updateConnectionStatus(
    id, 
    connectionTest.success ? 'connected' : 'error'
  );

  logger.info('WordPress connection tested', { 
    userId, 
    siteId: id, 
    success: connectionTest.success 
  });

  res.json({
    success: true,
    data: connectionTest,
  });
});

export const getCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const site = await WordPressSiteModel.findByIdWithCredentials(id, userId);
  
  if (!site) {
    throw createError('Site not found', 404);
  }

  const categories = await WordPressService.getCategories(
    site.url,
    site.credentials.username,
    site.credentials.password
  );

  res.json({
    success: true,
    data: categories,
  });
});