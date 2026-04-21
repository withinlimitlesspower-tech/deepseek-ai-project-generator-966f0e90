import { Router, Request, Response } from 'express';
import { ConversationService } from '../../services/conversation.service';
import { validateConversationRequest } from '../../middleware/validation.middleware';
import { ConversationRequest, ConversationResponse, ConversationHistory } from '../../types/conversation.types';
import { ApiError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

const router = Router();
const conversationService = new ConversationService();

/**
 * @route   POST /api/conversation/new
 * @desc    Start a new conversation session
 * @access  Public
 */
router.post('/new', async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, context } = req.body;
        
        if (!userId) {
            throw new ApiError(400, 'User ID is required');
        }

        const sessionId = await conversationService.createNewSession(userId, context);
        
        const response: ConversationResponse = {
            success: true,
            sessionId,
            message: 'New conversation session created successfully',
            timestamp: new Date().toISOString()
        };

        res.status(201).json(response);
    } catch (error) {
        logger.error('Error creating new conversation session:', error);
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
});

/**
 * @route   POST /api/conversation/message
 * @desc    Send a message in an existing conversation
 * @access  Public
 */
router.post('/message', validateConversationRequest, async (req: Request, res: Response): Promise<void> => {
    try {
        const conversationRequest: ConversationRequest = req.body;
        
        const result = await conversationService.processMessage(conversationRequest);
        
        const response: ConversationResponse = {
            success: true,
            sessionId: conversationRequest.sessionId,
            message: result.message,
            context: result.context,
            metadata: result.metadata,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    } catch (error) {
        logger.error('Error processing conversation message:', error);
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
});

/**
 * @route   GET /api/conversation/history/:sessionId
 * @desc    Get conversation history for a session
 * @access  Public
 */
router.get('/history/:sessionId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId) {
            throw new ApiError(400, 'Session ID is required');
        }

        const history = await conversationService.getConversationHistory(sessionId);
        
        const response: ConversationHistory = {
            success: true,
            sessionId,
            messages: history.messages,
            context: history.context,
            createdAt: history.createdAt,
            updatedAt: history.updatedAt,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
});

/**
 * @route   PUT /api/conversation/context/:sessionId
 * @desc    Update conversation context
 * @access  Public
 */
router.put('/context/:sessionId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const { context } = req.body;
        
        if (!sessionId) {
            throw new ApiError(400, 'Session ID is required');
        }

        if (!context || typeof context !== 'object') {
            throw new ApiError(400, 'Valid context object is required');
        }

        await conversationService.updateContext(sessionId, context);
        
        const response: ConversationResponse = {
            success: true,
            sessionId,
            message: 'Context updated successfully',
            context,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    } catch (error) {
        logger.error('Error updating conversation context:', error);
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
});

/**
 * @route   DELETE /api/conversation/:sessionId
 * @desc    Delete a conversation session
 * @access  Public
 */
router.delete('/:sessionId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId) {
            throw new ApiError(400, 'Session ID is required');
        }

        await conversationService.deleteSession(sessionId);
        
        const response: ConversationResponse = {
            success: true,
            sessionId,
            message: 'Conversation session deleted successfully',
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    } catch (error) {
        logger.error('Error deleting conversation session:', error);
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
});

/**
 * @route   GET /api/conversation/sessions/:userId
 * @desc    Get all conversation sessions for a user
 * @access  Public
 */
router.get('/sessions/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            throw new ApiError(400, 'User ID is required');
        }

        const sessions = await conversationService.getUserSessions(userId);
        
        res.status(200).json({
            success: true,
            userId,
            sessions,
            count: sessions.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching user sessions:', error);
        
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
});

/**
 * @route   POST /api/conversation/stream
 * @desc    Stream conversation responses (SSE)
 * @access  Public
 */
router.post('/stream', validateConversationRequest, async (req: Request, res: Response): Promise<void> => {
    try {
        const conversationRequest: ConversationRequest = req.body;
        
        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep