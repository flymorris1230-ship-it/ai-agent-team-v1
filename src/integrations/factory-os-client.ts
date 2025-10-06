/**
 * Factory OS Integration Client
 * 用於與 Genesis Factory OS 進行雙向通訊
 */

export interface FactoryOSConfig {
  baseURL: string
  apiKey?: string
  timeout?: number
}

export interface FactoryOSPingResponse {
  message: string
  timestamp: string
  status: 'healthy' | 'degraded' | 'down'
}

export interface FactoryOSDBStatus {
  status: 'connected' | 'error'
  latest_migrations?: Array<{
    migration_name: string
    finished_at: Date | null
  }>
  error?: string
}

export interface FactoryOSSystemMetrics {
  factory_status: 'healthy' | 'degraded' | 'down'
  response_time_ms: number
  database_status: 'connected' | 'error'
  last_check: string
}

export interface FactoryOSIntegrationStatus {
  timestamp: string
  response_time_ms: number
  factory_os: {
    status: string
    version: string
    environment: string
    database: string
  }
  gac: {
    status: string
    api_url: string
    health_data: any
    error: any
  }
  integration: {
    operational: boolean
    capabilities: string[]
  }
}

export class FactoryOSClient {
  private baseURL: string
  private apiKey?: string
  private timeout: number

  constructor(config: FactoryOSConfig) {
    this.baseURL = config.baseURL
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000 // 30 seconds default
  }

  /**
   * Retry wrapper for API calls
   */
  private async retryFetch<T>(
    fetchFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetchFn()
      } catch (error) {
        lastError = error as Error
        if (i < maxRetries - 1) {
          // 指數退避: 1秒、2秒、4秒
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
        }
      }
    }

    throw lastError!
  }

  /**
   * Generic request method with timeout and retry
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Factory OS API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as any

      // Handle tRPC response format: { result: { data: { json: {...} } } }
      if (data.result && data.result.data && data.result.data.json) {
        return data.result.data.json as T
      }

      // Fallback to direct response (for non-tRPC endpoints)
      return data as T
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Ping - 基本健康檢查
   */
  async ping(): Promise<FactoryOSPingResponse> {
    try {
      const response = await this.retryFetch(async () => {
        return await this.request<FactoryOSPingResponse>('/api/trpc/health.ping')
      })

      return response
    } catch (error) {
      console.error('[FactoryOS] Ping failed:', error)
      return {
        message: 'error',
        timestamp: new Date().toISOString(),
        status: 'down',
      }
    }
  }

  /**
   * 檢查數據庫狀態
   */
  async checkDBStatus(): Promise<FactoryOSDBStatus> {
    try {
      const response = await this.retryFetch(async () => {
        return await this.request<any>('/api/trpc/health.migrations')
      })

      return {
        status: (response.status === 'up-to-date' || response.status === 'connected') ? 'connected' : 'error',
        latest_migrations: response.latest_migrations,
      }
    } catch (error) {
      console.error('[FactoryOS] DB status check failed:', error)
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 獲取系統指標
   */
  async getSystemMetrics(): Promise<FactoryOSSystemMetrics> {
    const startTime = Date.now()

    try {
      // 使用重試機制並行請求
      const [pingResult, dbResult] = await this.retryFetch(async () => {
        return await Promise.all([
          this.ping(),
          this.checkDBStatus(),
        ])
      })

      const responseTime = Date.now() - startTime

      return {
        factory_status: pingResult.status === 'healthy' && dbResult.status === 'connected'
          ? 'healthy'
          : 'degraded',
        response_time_ms: responseTime,
        database_status: dbResult.status === 'connected' ? 'connected' : 'error',
        last_check: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[FactoryOS] System metrics failed:', error)
      return {
        factory_status: 'down',
        response_time_ms: Date.now() - startTime,
        database_status: 'error',
        last_check: new Date().toISOString(),
      }
    }
  }

  /**
   * 獲取整合狀態（包含 GAC 連接狀態）
   */
  async getIntegrationStatus(): Promise<FactoryOSIntegrationStatus | null> {
    try {
      const response = await this.retryFetch(async () => {
        return await this.request<FactoryOSIntegrationStatus>(
          '/api/trpc/health.integrationStatus'
        )
      })

      return response
    } catch (error) {
      console.error('[FactoryOS] Integration status failed:', error)
      return null
    }
  }

  /**
   * 完整健康檢查（包含所有指標）
   */
  async fullHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    metrics: FactoryOSSystemMetrics
    integration_status: FactoryOSIntegrationStatus | null
    timestamp: string
  }> {
    const metrics = await this.getSystemMetrics()
    const integration_status = await this.getIntegrationStatus()

    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy'

    if (metrics.factory_status === 'down') {
      overallStatus = 'down'
    } else if (
      metrics.factory_status === 'degraded' ||
      integration_status?.integration.operational === false
    ) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      metrics,
      integration_status,
      timestamp: new Date().toISOString(),
    }
  }
}
