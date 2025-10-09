/**
 * Custom Agent Executor
 * Executes custom agents with their configured capabilities
 */

import type { Env } from '../types';
import { Logger } from '../utils/logger';
import type { CustomAgent } from './agent-builder';
import { AudioProcessorService } from '../services/audio-processor';
import { ImageProcessorService } from '../services/image-processor';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image' | 'audio';
  text?: string;
  image_url?: string;
  audio_url?: string;
}

export interface AgentExecutionResult {
  response: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  has_audio?: boolean;
  has_image?: boolean;
  audio_url?: string;
  image_urls?: string[];
  processing_time_ms: number;
}

export class CustomAgentExecutor {
  private logger: Logger;
  private audioProcessor: AudioProcessorService;
  private imageProcessor: ImageProcessorService;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'CustomAgentExecutor');
    this.audioProcessor = new AudioProcessorService(env);
    this.imageProcessor = new ImageProcessorService(env);
  }

  /**
   * Execute a custom agent with given messages
   */
  async executeAgent(
    agent: CustomAgent,
    messages: AgentMessage[],
    options?: {
      conversation_id?: string;
      enable_audio_response?: boolean;
      enable_image_generation?: boolean;
    }
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    await this.logger.info('Executing custom agent', {
      agentId: agent.id,
      agentName: agent.name,
      messageCount: messages.length,
    });

    try {
      // Build system message from agent instructions
      const systemMessage: AgentMessage = {
        role: 'system',
        content: agent.instructions,
      };

      // Process any audio messages (transcribe to text)
      const processedMessages = await this.preprocessMessages(agent, messages);

      // Call LLM API (Claude, GPT, etc.)
      const llmResponse = await this.callLLM(agent, [systemMessage, ...processedMessages]);

      // Post-process response (TTS, image generation if needed)
      const postProcessed = await this.postprocessResponse(agent, llmResponse, options);

      const processingTime = Date.now() - startTime;

      await this.logger.info('Agent execution completed', {
        agentId: agent.id,
        processingTime,
        hasAudio: postProcessed.has_audio,
        hasImage: postProcessed.has_image,
      });

      return {
        ...postProcessed,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      await this.logger.error('Agent execution failed', { agentId: agent.id, error });
      throw new Error(`Agent execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Preprocess messages - transcribe audio, analyze images
   */
  private async preprocessMessages(agent: CustomAgent, messages: AgentMessage[]): Promise<AgentMessage[]> {
    const processed: AgentMessage[] = [];

    for (const message of messages) {
      if (typeof message.content === 'string') {
        processed.push(message);
        continue;
      }

      // Multi-modal message
      const contentParts: MessageContent[] = [];

      for (const part of message.content) {
        if (part.type === 'text') {
          contentParts.push(part);
        } else if (part.type === 'audio' && agent.supports_audio && part.audio_url) {
          // Transcribe audio
          try {
            // TODO: Fetch audio from URL and transcribe
            // const audioResponse = await fetch(part.audio_url);
            // const audioBuffer = await audioResponse.arrayBuffer();
            // const transcription = await this.audioProcessor.transcribeAudio(audioBuffer);
            contentParts.push({
              type: 'text',
              text: `[Audio transcription: placeholder]`,
            });
          } catch (error) {
            await this.logger.error('Audio transcription failed', { error });
          }
        } else if (part.type === 'image' && agent.supports_image && part.image_url) {
          // Keep image for vision model
          contentParts.push(part);
        }
      }

      // Convert to text if no vision support
      if (!agent.supports_image) {
        const textContent = contentParts
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('\n');
        processed.push({
          role: message.role,
          content: textContent,
        });
      } else {
        processed.push({
          role: message.role,
          content: contentParts,
        });
      }
    }

    return processed;
  }

  /**
   * Call LLM API (Claude, GPT, etc.)
   */
  private async callLLM(agent: CustomAgent, messages: AgentMessage[]): Promise<{
    content: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
  }> {
    // TODO: Integrate with actual LLM API (Claude, GPT-4, etc.)
    // For now, placeholder implementation

    // Example: Call Claude API
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': this.env.ANTHROPIC_API_KEY,
    //     'anthropic-version': '2023-06-01',
    //     'content-type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: agent.model,
    //     max_tokens: agent.max_tokens,
    //     temperature: agent.temperature,
    //     messages: messages.map((m) => ({
    //       role: m.role === 'system' ? 'user' : m.role,
    //       content: m.content,
    //     })),
    //   }),
    // });
    //
    // const result = await response.json();

    // Placeholder response
    return {
      content: `[Placeholder response from ${agent.name}]\n\nThis is where the actual LLM response would appear. The agent is configured with:\n- Model: ${agent.model}\n- Temperature: ${agent.temperature}\n- Max tokens: ${agent.max_tokens}\n\nCapabilities: ${agent.capabilities.join(', ')}`,
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      },
    };
  }

  /**
   * Post-process response - generate audio/images if requested
   */
  private async postprocessResponse(
    agent: CustomAgent,
    llmResponse: {
      content: string;
      usage?: any;
    },
    options?: {
      conversation_id?: string;
      enable_audio_response?: boolean;
      enable_image_generation?: boolean;
    }
  ): Promise<AgentExecutionResult> {
    const result: AgentExecutionResult = {
      response: llmResponse.content,
      usage: llmResponse.usage,
      processing_time_ms: 0, // Will be set by caller
    };

    // Generate TTS if enabled
    if (agent.supports_audio && options?.enable_audio_response) {
      try {
        const ttsResult = await this.audioProcessor.textToSpeech(llmResponse.content, {
          voice: agent.audio_config?.voice,
          speed: agent.audio_config?.speed,
        });

        result.has_audio = true;
        result.audio_url = ttsResult.audio_url;

        // Store in database if conversation_id provided
        if (options.conversation_id) {
          await this.audioProcessor.storeAudioMessage({
            conversation_id: options.conversation_id,
            audio_url: ttsResult.audio_url,
            audio_format: ttsResult.audio_format,
            duration_seconds: ttsResult.duration_seconds,
            file_size_bytes: ttsResult.file_size_bytes,
            is_generated: true,
            voice_id: ttsResult.voice_id,
          });
        }
      } catch (error) {
        await this.logger.error('TTS generation failed', { error });
      }
    }

    // Check if response contains image generation requests
    // This would require parsing the response for image generation markers
    // For now, placeholder implementation

    return result;
  }

  /**
   * Execute custom agent for a single user message
   */
  async chat(
    agent: CustomAgent,
    userMessage: string,
    options?: {
      conversation_id?: string;
      conversation_history?: AgentMessage[];
      enable_audio_response?: boolean;
    }
  ): Promise<AgentExecutionResult> {
    const messages: AgentMessage[] = [
      ...(options?.conversation_history || []),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    return this.executeAgent(agent, messages, options);
  }
}
