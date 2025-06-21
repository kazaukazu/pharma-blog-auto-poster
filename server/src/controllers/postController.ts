import { Request, Response, NextFunction } from 'express';
import { PostModel } from '../models/Post';
import { WordPressSiteModel } from '../models/WordPressSite';
import { WordPressService } from '../services/wordpressService';
import { PostingService } from '../services/postingService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const createPost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const { title, content, topic_id, template_id, scheduled_at } = req.body;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  // Create post
  const post = await PostModel.create({
    site_id,
    title,
    content,
    topic_id,
    template_id,
    scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    status: scheduled_at ? 'scheduled' : 'draft',
  });

  logger.info('Post created', { 
    userId, 
    siteId: site_id, 
    postId: post.id, 
    title 
  });

  res.status(201).json({
    success: true,
    data: post,
  });
});

export const getPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const { page = 1, limit = 20, status } = req.query;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  let posts;
  if (status) {
    const postList = await PostModel.getPostsByStatus(site_id, status as string);
    posts = {
      posts: postList,
      total: postList.length,
      totalPages: 1,
    };
  } else {
    posts = await PostModel.findBySiteId(site_id, Number(page), Number(limit));
  }

  res.json({
    success: true,
    data: {
      ...posts,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

export const getPost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const post = await PostModel.findById(id, site_id);
  if (!post) {
    throw createError('Post not found', 404);
  }

  res.json({
    success: true,
    data: post,
  });
});

export const updatePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const updates = req.body;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  // Handle scheduled_at conversion
  if (updates.scheduled_at) {
    updates.scheduled_at = new Date(updates.scheduled_at);
  }

  const updatedPost = await PostModel.update(id, site_id, updates);
  if (!updatedPost) {
    throw createError('Post not found', 404);
  }

  logger.info('Post updated', { 
    userId, 
    siteId: site_id, 
    postId: id, 
    updates: Object.keys(updates) 
  });

  res.json({
    success: true,
    data: updatedPost,
  });
});

export const deletePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  // Get post to check if it has a WordPress post ID
  const post = await PostModel.findById(id, site_id);
  if (!post) {
    throw createError('Post not found', 404);
  }

  // If post is published to WordPress, delete it there too
  if (post.wordpress_post_id) {
    try {
      const siteWithCredentials = await WordPressSiteModel.findByIdWithCredentials(site_id, userId);
      if (siteWithCredentials) {
        await WordPressService.deletePost(
          siteWithCredentials.url,
          siteWithCredentials.credentials.username,
          siteWithCredentials.credentials.password,
          post.wordpress_post_id
        );
      }
    } catch (error) {
      logger.warn('Failed to delete WordPress post, but continuing with local deletion', {
        postId: id,
        wordpressPostId: post.wordpress_post_id,
        error,
      });
    }
  }

  const success = await PostModel.delete(id, site_id);
  if (!success) {
    throw createError('Failed to delete post', 500);
  }

  logger.info('Post deleted', { userId, siteId: site_id, postId: id });

  res.json({
    success: true,
    message: 'Post deleted successfully',
  });
});

export const publishPost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const post = await PostModel.findById(id, site_id);
  if (!post) {
    throw createError('Post not found', 404);
  }

  if (!post.content) {
    throw createError('Post content is required for publishing', 400);
  }

  try {
    // Update post status to processing
    await PostModel.update(id, site_id, { status: 'processing' });

    // Publish to WordPress
    const result = await PostingService.publishPost(site_id, id);

    if (result.success) {
      logger.info('Post published successfully', { userId, siteId: site_id, postId: id });
      
      res.json({
        success: true,
        message: 'Post published successfully',
        data: result.post,
      });
    } else {
      throw createError(result.error || 'Failed to publish post', 500);
    }
  } catch (error: any) {
    // Update post status back to draft with error message
    await PostModel.update(id, site_id, { 
      status: 'failed',
      error_message: error.message 
    });
    
    throw error;
  }
});

export const schedulePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const { scheduled_at } = req.body;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const scheduledDate = new Date(scheduled_at);
  if (scheduledDate <= new Date()) {
    throw createError('Scheduled time must be in the future', 400);
  }

  const updatedPost = await PostModel.update(id, site_id, {
    scheduled_at: scheduledDate,
    status: 'scheduled',
    error_message: null,
  });

  if (!updatedPost) {
    throw createError('Post not found', 404);
  }

  logger.info('Post scheduled', { 
    userId, 
    siteId: site_id, 
    postId: id, 
    scheduledAt: scheduledDate 
  });

  res.json({
    success: true,
    data: updatedPost,
  });
});

export const getPostStats = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const stats = await PostModel.getPostStats(site_id);

  res.json({
    success: true,
    data: stats,
  });
});

export const retryFailedPost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const post = await PostModel.findById(id, site_id);
  if (!post) {
    throw createError('Post not found', 404);
  }

  if (post.status !== 'failed') {
    throw createError('Only failed posts can be retried', 400);
  }

  // Reset post status and clear error message
  const updatedPost = await PostModel.update(id, site_id, {
    status: 'draft',
    error_message: null,
  });

  logger.info('Failed post reset for retry', { userId, siteId: site_id, postId: id });

  res.json({
    success: true,
    data: updatedPost,
  });
});