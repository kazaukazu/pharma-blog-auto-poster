import { Request, Response, NextFunction } from 'express';
import { ClaudeRequestModel } from '../models/ClaudeRequest';
import { PostModel } from '../models/Post';
import { WordPressSiteModel } from '../models/WordPressSite';
import { ClaudeService } from '../services/claudeService';
import { ClaudeRequestData } from '../../../shared/types';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const generateArticle = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const { request_data, create_post = true } = req.body;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  // Create Claude request record
  const claudeRequest = await ClaudeRequestModel.create({
    site_id,
    request_data,
  });

  try {
    // Update status to processing
    await ClaudeRequestModel.update(claudeRequest.id, { status: 'processing' });

    // Generate article using Claude
    const result = await ClaudeService.generateArticle(request_data);

    if (!result.success) {
      await ClaudeRequestModel.update(claudeRequest.id, {
        status: 'failed',
        error_message: result.error,
      });

      throw createError(result.error || 'Failed to generate article', 500);
    }

    // Update Claude request with response
    const updatedRequest = await ClaudeRequestModel.update(claudeRequest.id, {
      status: 'completed',
      response_data: result.data,
    });

    let post = null;
    if (create_post && result.data) {
      // Create a new post with the generated content
      post = await PostModel.create({
        site_id,
        title: result.data.title,
        content: result.data.content,
        meta_description: result.data.meta_description,
        tags: result.data.tags,
        claude_request_id: claudeRequest.id,
        status: 'draft',
      });

      // Update Claude request with post ID
      await ClaudeRequestModel.update(claudeRequest.id, { post_id: post.id });

      logger.info('Article generated and post created', {
        userId,
        siteId: site_id,
        claudeRequestId: claudeRequest.id,
        postId: post.id,
        title: result.data.title,
      });
    } else {
      logger.info('Article generated successfully', {
        userId,
        siteId: site_id,
        claudeRequestId: claudeRequest.id,
        title: result.data?.title,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        request: updatedRequest,
        article: result.data,
        post,
      },
    });
  } catch (error: any) {
    // Update Claude request with error
    await ClaudeRequestModel.update(claudeRequest.id, {
      status: 'failed',
      error_message: error.message,
    });

    throw error;
  }
});

export const getClaudeRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const requests = await ClaudeRequestModel.findBySiteId(site_id, Number(page), Number(limit));

  res.json({
    success: true,
    data: {
      ...requests,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

export const getClaudeRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const request = await ClaudeRequestModel.findById(id);
  if (!request || request.site_id !== site_id) {
    throw createError('Claude request not found', 404);
  }

  res.json({
    success: true,
    data: request,
  });
});

export const retryClaudeRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const request = await ClaudeRequestModel.findById(id);
  if (!request || request.site_id !== site_id) {
    throw createError('Claude request not found', 404);
  }

  if (request.status !== 'failed') {
    throw createError('Only failed requests can be retried', 400);
  }

  try {
    // Update status to processing
    await ClaudeRequestModel.update(id, { 
      status: 'processing',
      error_message: null,
    });

    // Retry article generation
    const result = await ClaudeService.generateArticle(request.request_data);

    if (!result.success) {
      await ClaudeRequestModel.update(id, {
        status: 'failed',
        error_message: result.error,
      });

      throw createError(result.error || 'Failed to generate article', 500);
    }

    // Update request with new response
    const updatedRequest = await ClaudeRequestModel.update(id, {
      status: 'completed',
      response_data: result.data,
    });

    // If there's an associated post, update it
    if (request.post_id && result.data) {
      await PostModel.update(request.post_id, site_id, {
        title: result.data.title,
        content: result.data.content,
        meta_description: result.data.meta_description,
        tags: result.data.tags,
        status: 'draft',
        error_message: null,
      });
    }

    logger.info('Claude request retried successfully', {
      userId,
      siteId: site_id,
      claudeRequestId: id,
      title: result.data?.title,
    });

    res.json({
      success: true,
      data: {
        request: updatedRequest,
        article: result.data,
      },
    });
  } catch (error: any) {
    await ClaudeRequestModel.update(id, {
      status: 'failed',
      error_message: error.message,
    });

    throw error;
  }
});

export const getClaudeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const stats = await ClaudeRequestModel.getRequestStats(site_id);

  res.json({
    success: true,
    data: stats,
  });
});

export const testClaudeConnection = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const result = await ClaudeService.testConnection();

  if (result.success) {
    res.json({
      success: true,
      message: 'Claude API connection successful',
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
    });
  }
});

export const deleteClaudeRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { site_id, id } = req.params;
  const userId = req.user!.id;

  // Verify site ownership
  const site = await WordPressSiteModel.findById(site_id, userId);
  if (!site) {
    throw createError('Site not found', 404);
  }

  const request = await ClaudeRequestModel.findById(id);
  if (!request || request.site_id !== site_id) {
    throw createError('Claude request not found', 404);
  }

  const success = await ClaudeRequestModel.delete(id);
  if (!success) {
    throw createError('Failed to delete Claude request', 500);
  }

  logger.info('Claude request deleted', { userId, siteId: site_id, claudeRequestId: id });

  res.json({
    success: true,
    message: 'Claude request deleted successfully',
  });
});