/**
 * Image Processing API Routes
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { ImageProcessorService } from '../../services/image-processor';

export const imageRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware
imageRoutes.use('*', authMiddleware);

/**
 * POST /images/analyze - Analyze image with vision AI
 */
imageRoutes.post('/analyze', async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File;
    const detectObjects = formData.get('detect_objects') === 'true';
    const extractText = formData.get('extract_text') === 'true';
    const detailedDescription = formData.get('detailed_description') === 'true';

    if (!imageFile) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_FILE', message: 'Image file is required' },
        },
        400
      );
    }

    const imageBuffer = await imageFile.arrayBuffer();

    const imageProcessor = new ImageProcessorService(c.env);
    const result = await imageProcessor.analyzeImage(imageBuffer, {
      detect_objects: detectObjects,
      extract_text: extractText,
      detailed_description: detailedDescription,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /images/ocr - Extract text from image
 */
imageRoutes.post('/ocr', async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File;
    const language = formData.get('language') as string | null;

    if (!imageFile) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_FILE', message: 'Image file is required' },
        },
        400
      );
    }

    const imageBuffer = await imageFile.arrayBuffer();

    const imageProcessor = new ImageProcessorService(c.env);
    const text = await imageProcessor.extractTextFromImage(imageBuffer, {
      language: language || undefined,
    });

    return c.json({
      success: true,
      data: {
        text,
        length: text.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'OCR_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /images/generate - Generate image from text prompt
 */
imageRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { prompt, model, size, quality, style } = body;

    if (!prompt) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PROMPT', message: 'Prompt is required' },
        },
        400
      );
    }

    const imageProcessor = new ImageProcessorService(c.env);
    const result = await imageProcessor.generateImage(prompt, {
      model,
      size,
      quality,
      style,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'GENERATION_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /images/upload - Upload image file
 */
imageRoutes.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File;
    const conversationId = formData.get('conversation_id') as string;

    if (!imageFile || !conversationId) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Image file and conversation_id are required' },
        },
        400
      );
    }

    const imageBuffer = await imageFile.arrayBuffer();
    const format = imageFile.name.split('.').pop() || 'jpg';

    const imageProcessor = new ImageProcessorService(c.env);

    // Upload to R2
    const imageUrl = await imageProcessor.uploadImageToR2(imageBuffer, format);

    // Store metadata
    const imageMessage = await imageProcessor.storeImageMessage({
      conversation_id: conversationId,
      image_url: imageUrl,
      image_format: format,
      file_size_bytes: imageBuffer.byteLength,
    });

    return c.json({
      success: true,
      data: imageMessage,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'UPLOAD_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /images/messages/:conversationId - Get image messages for conversation
 */
imageRoutes.get('/messages/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');

    const imageProcessor = new ImageProcessorService(c.env);
    const messages = await imageProcessor.getImageMessages(conversationId);

    return c.json({
      success: true,
      data: {
        messages,
        count: messages.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'FETCH_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});
