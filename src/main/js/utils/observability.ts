/**
 * Genesis Observability Integration
 * Tracks LLM usage, tokens, costs, and latency across all providers
 */

export interface ObservabilityData {
  project_id: string;
  model: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  input_tokens: number;
  output_tokens: number;
  latency_ms?: number;
  metadata?: Record<string, any>;
}

export interface ObservabilityConfig {
  apiUrl: string;
  apiKey: string;
  projectId: string;
  enabled: boolean;
}

/**
 * Send usage data to Genesis Observability
 * Non-blocking call - errors will not affect main flow
 */
export async function sendToObservability(
  data: Omit<ObservabilityData, 'project_id'>,
  config: ObservabilityConfig
): Promise<void> {
  // Skip if observability is disabled
  if (!config.enabled) {
    return;
  }

  // Validate required fields
  if (!config.apiUrl || !config.apiKey || !config.projectId) {
    console.warn('[Observability] Missing configuration, skipping tracking');
    return;
  }

  try {
    // Prepare payload
    const payload: ObservabilityData = {
      project_id: config.projectId,
      model: data.model,
      provider: data.provider,
      input_tokens: data.input_tokens,
      output_tokens: data.output_tokens,
      latency_ms: data.latency_ms,
      metadata: {
        ...data.metadata,
        timestamp: new Date().toISOString(),
      },
    };

    // Send to observability API (non-blocking, fire-and-forget)
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Observability] Failed to send data:', error);
    } else {
      console.log('[Observability] Data sent successfully:', {
        model: payload.model,
        provider: payload.provider,
        tokens: payload.input_tokens + payload.output_tokens,
      });
    }
  } catch (error) {
    // Catch all errors to prevent blocking main flow
    console.error('[Observability] Error sending data:', error);
  }
}

/**
 * Create observability config from environment variables
 */
export function createObservabilityConfig(env: any): ObservabilityConfig {
  return {
    apiUrl: env.OBSERVABILITY_API_URL || '',
    apiKey: env.OBSERVABILITY_API_KEY || '',
    projectId: env.OBSERVABILITY_PROJECT_ID || 'GAC_FactoryOS',
    enabled: env.ENABLE_OBSERVABILITY === 'true' || env.ENABLE_OBSERVABILITY === true,
  };
}
