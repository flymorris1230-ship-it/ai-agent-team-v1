/**
 * Audio Processing API Routes
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { AudioProcessorService } from '../../services/audio-processor';

export const audioRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware
audioRoutes.use('*', authMiddleware);

/**
 * POST /audio/transcribe - Transcribe audio to text (STT)
 */
audioRoutes.post('/transcribe', async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string | null;
    const prompt = formData.get('prompt') as string | null;

    if (!audioFile) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_FILE', message: 'Audio file is required' },
        },
        400
      );
    }

    const audioBuffer = await audioFile.arrayBuffer();

    const audioProcessor = new AudioProcessorService(c.env);
    const result = await audioProcessor.transcribeAudio(audioBuffer, {
      language: language || undefined,
      prompt: prompt || undefined,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'TRANSCRIPTION_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /audio/speak - Convert text to speech (TTS)
 */
audioRoutes.post('/speak', async (c) => {
  try {
    const body = await c.req.json();
    const { text, voice, speed, format } = body;

    if (!text) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_TEXT', message: 'Text is required' },
        },
        400
      );
    }

    const audioProcessor = new AudioProcessorService(c.env);
    const result = await audioProcessor.textToSpeech(text, {
      voice,
      speed,
      format,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'TTS_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /audio/upload - Upload audio file
 */
audioRoutes.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;
    const conversationId = formData.get('conversation_id') as string;

    if (!audioFile || !conversationId) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Audio file and conversation_id are required' },
        },
        400
      );
    }

    const audioBuffer = await audioFile.arrayBuffer();
    const format = audioFile.name.split('.').pop() || 'mp3';

    const audioProcessor = new AudioProcessorService(c.env);

    // Upload to R2
    const audioUrl = await audioProcessor.uploadAudioToR2(audioBuffer, format);

    // Store metadata
    const audioMessage = await audioProcessor.storeAudioMessage({
      conversation_id: conversationId,
      audio_url: audioUrl,
      audio_format: format,
      file_size_bytes: audioBuffer.byteLength,
    });

    return c.json({
      success: true,
      data: audioMessage,
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
 * GET /audio/messages/:conversationId - Get audio messages for conversation
 */
audioRoutes.get('/messages/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');

    const audioProcessor = new AudioProcessorService(c.env);
    const messages = await audioProcessor.getAudioMessages(conversationId);

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
