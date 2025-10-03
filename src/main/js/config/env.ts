/**
 * Environment Configuration and Validation
 */

import { z } from 'zod';

/**
 * Environment variables schema
 */
const envSchema = z.object({
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),

  // PostgreSQL
  POSTGRES_HOST: z.string().default('192.168.1.114'),
  POSTGRES_PORT: z.string().default('5532'),
  POSTGRES_DB: z.string().default('postgres'),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().min(1, 'PostgreSQL password is required'),

  // PostgreSQL Proxy
  POSTGRES_PROXY_API_KEY: z.string().default('your-secure-api-key-here'),
  POSTGRES_PROXY_URL: z.string().url().optional(),

  // Application
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warning', 'error']).default('info'),
  DOMAIN: z.string().default('shyangtsuen.xyz'),

  // Security
  JWT_SECRET: z.string().optional(),
  API_KEY: z.string().optional(),

  // Feature Flags
  ENABLE_POSTGRES_VECTOR: z.string().transform(val => val === 'true').default('true'),
  ENABLE_HYBRID_SEARCH: z.string().transform(val => val === 'true').default('false'),
  ENABLE_AUTO_SYNC: z.string().transform(val => val === 'true').default('true'),
  SYNC_INTERVAL_SECONDS: z.string().transform(val => parseInt(val)).default('300'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 */
export function validateEnv(env: Record<string, any>): EnvConfig {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');

      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Get configuration from environment
 */
export function getConfig(env: Record<string, any>) {
  const validated = validateEnv(env);

  return {
    openai: {
      apiKey: validated.OPENAI_API_KEY,
    },
    postgres: {
      host: validated.POSTGRES_HOST,
      port: parseInt(validated.POSTGRES_PORT),
      database: validated.POSTGRES_DB,
      user: validated.POSTGRES_USER,
      password: validated.POSTGRES_PASSWORD,
      proxyApiKey: validated.POSTGRES_PROXY_API_KEY,
      proxyUrl: validated.POSTGRES_PROXY_URL || `http://${validated.POSTGRES_HOST}:8000`,
    },
    app: {
      environment: validated.ENVIRONMENT,
      logLevel: validated.LOG_LEVEL,
      domain: validated.DOMAIN,
    },
    security: {
      jwtSecret: validated.JWT_SECRET,
      apiKey: validated.API_KEY,
    },
    features: {
      enablePostgresVector: validated.ENABLE_POSTGRES_VECTOR,
      enableHybridSearch: validated.ENABLE_HYBRID_SEARCH,
      enableAutoSync: validated.ENABLE_AUTO_SYNC,
      syncIntervalSeconds: validated.SYNC_INTERVAL_SECONDS,
    },
  };
}

/**
 * Environment helper for Workers
 */
export class EnvHelper {
  private config: ReturnType<typeof getConfig>;

  constructor(env: Record<string, any>) {
    this.config = getConfig(env);
  }

  get openai() {
    return this.config.openai;
  }

  get postgres() {
    return this.config.postgres;
  }

  get app() {
    return this.config.app;
  }

  get security() {
    return this.config.security;
  }

  get features() {
    return this.config.features;
  }

  isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  isStaging(): boolean {
    return this.config.app.environment === 'staging';
  }

  shouldLog(level: 'debug' | 'info' | 'warning' | 'error'): boolean {
    const levels = ['debug', 'info', 'warning', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.app.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }
}
