import type { Logger } from '../types/logger';

/**
 * API Client for IRIS Analysis Server
 *
 * POST /api/iris/analyze
 * Request: { filename, language, source_code, metadata }
 * Response: { file_intent, metadata, responsibility_blocks }
 */

/**
 * Analysis request payload
 */
export interface AnalysisRequest {
  filename: string;
  language: string;
  source_code: string;
  metadata?: Record<string, any>;
}

/**
 * Responsibility block from API (ONE-based line numbers)
 */
export interface APIResponsibilityBlock {
  description: string;
  label: string;
  ranges: Array<[number, number]>;
}

/**
 * Analysis response from server
 */
export interface AnalysisResponse {
  file_intent: string;
  metadata: Record<string, any>;
  responsibility_blocks: APIResponsibilityBlock[];
}

/**
 * API error types for structured error handling
 */
export enum APIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  HTTP_ERROR = 'HTTP_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  PARSE_ERROR = 'PARSE_ERROR'
}

/**
 * Structured API error
 */
export class APIError extends Error {
  constructor(
    public readonly type: APIErrorType,
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * API Client configuration
 */
export interface APIClientConfig {
  endpoint: string;
  timeout: number;
}

/**
 * IRIS API Client with comprehensive error handling
 */
export class IRISAPIClient {
  private config: APIClientConfig;
  private logger: Logger;

  constructor(config: APIClientConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    this.logger.info('API Client initialized', {
      endpoint: config.endpoint,
      timeout: config.timeout
    });
  }

  /**
   * Send analysis request with comprehensive error handling
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    this.logger.info('Starting analysis request', {
      filename: request.filename,
      language: request.language,
      sourceLength: request.source_code.length
    });

    try {
      const response = await this.executeRequest(request);
      const validatedResponse = this.validateResponse(response);
      
      this.logger.info('Analysis request completed successfully', {
        filename: request.filename,
        blockCount: validatedResponse.responsibility_blocks.length
      });
      
      return validatedResponse;
      
    } catch (error) {
      // No silent failures
      if (error instanceof APIError) {
        this.logger.error(`API Error: ${error.type}`, {
          message: error.message,
          statusCode: error.statusCode,
          filename: request.filename
        });
        throw error;
      }
      
      // Unexpected error - wrap it
      this.logger.errorWithException('Unexpected error during analysis', error, {
        filename: request.filename
      });
      
      throw new APIError(
        APIErrorType.NETWORK_ERROR,
        'Unexpected error during analysis request',
        undefined,
        error
      );
    }
  }

  /**
   * Execute HTTP request with timeout
   */
  private async executeRequest(request: AnalysisRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      this.logger.debug('Sending POST request', {
        endpoint: this.config.endpoint,
        timeout: this.config.timeout
      });

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.logger.debug('Received response', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        
        throw new APIError(
          APIErrorType.HTTP_ERROR,
          `Server returned ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      // Parse JSON response
      try {
        const json = await response.json();
        return json;
      } catch (parseError) {
        throw new APIError(
          APIErrorType.PARSE_ERROR,
          'Failed to parse server response as JSON',
          response.status,
          parseError
        );
      }

    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError(
          APIErrorType.TIMEOUT,
          `Request timeout after ${this.config.timeout}ms`
        );
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new APIError(
          APIErrorType.NETWORK_ERROR,
          `Network error: ${error.message}`,
          undefined,
          error
        );
      }

      // Re-throw APIError as-is
      if (error instanceof APIError) {
        throw error;
      }

      // Wrap unknown errors
      throw new APIError(
        APIErrorType.NETWORK_ERROR,
        'Unknown network error',
        undefined,
        error
      );
    }
  }

  /**
   * Validate response schema defensively
   */
  private validateResponse(response: unknown): AnalysisResponse {
    this.logger.debug('Validating response schema');

    // Check if response is an object
    if (!response || typeof response !== 'object') {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        'Response is not an object'
      );
    }

    const record = response as Record<string, unknown>;

    // Validate file_intent (required, string)
    if (typeof record.file_intent !== 'string') {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        'Missing or invalid "file_intent" field (expected string)'
      );
    }

    // Validate responsibility_blocks (required, array)
    if (!Array.isArray(record.responsibility_blocks)) {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        'Missing or invalid "responsibility_blocks" field (expected array)'
      );
    }

    // Validate each responsibility block
    const blocks = record.responsibility_blocks as unknown[];
    for (let i = 0; i < blocks.length; i++) {
      this.validateResponsibilityBlock(blocks[i], i);
    }

    // Validate metadata (optional, object)
    const metadata = record.metadata ?? {};
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        'Invalid "metadata" field (expected object)'
      );
    }

    this.logger.debug('Response validation successful', {
      blockCount: blocks.length,
      fileIntentLength: record.file_intent.length
    });

    return {
      file_intent: record.file_intent,
      metadata: metadata as Record<string, any>,
      responsibility_blocks: blocks as APIResponsibilityBlock[]
    };
  }

  /**
   * Validate individual responsibility block
   */
  private validateResponsibilityBlock(block: unknown, index: number): void {
    if (!block || typeof block !== 'object') {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        `Responsibility block at index ${index} is not an object`
      );
    }

    const record = block as Record<string, unknown>;

    // Validate description (required, string)
    if (typeof record.description !== 'string') {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        `Block ${index}: missing or invalid "description" field (expected string)`
      );
    }

    // Validate label (required, string)
    if (typeof record.label !== 'string') {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        `Block ${index}: missing or invalid "label" field (expected string)`
      );
    }

    // Validate ranges (required, array of [number, number] tuples)
    if (!Array.isArray(record.ranges)) {
      throw new APIError(
        APIErrorType.INVALID_RESPONSE,
        `Block ${index}: missing or invalid "ranges" field (expected array)`
      );
    }

    const ranges = record.ranges as unknown[];
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      if (!Array.isArray(range) || range.length !== 2) {
        throw new APIError(
          APIErrorType.INVALID_RESPONSE,
          `Block ${index}, range ${i}: invalid format (expected [number, number])`
        );
      }

      const [start, end] = range as unknown[];
      if (typeof start !== 'number' || typeof end !== 'number') {
        throw new APIError(
          APIErrorType.INVALID_RESPONSE,
          `Block ${index}, range ${i}: invalid types (expected numbers)`
        );
      }

      if (start < 1 || end < 1 || start > end) {
        throw new APIError(
          APIErrorType.INVALID_RESPONSE,
          `Block ${index}, range ${i}: invalid values (start=${start}, end=${end})`
        );
      }
    }
  }

  /**
   * Get user-friendly error message from API error
   */
  static getUserMessage(error: APIError): string {
    switch (error.type) {
      case APIErrorType.NETWORK_ERROR:
        return 'Unable to connect to IRIS server. Please check your connection.';
      
      case APIErrorType.TIMEOUT:
        return 'Analysis request timed out. The file may be too large or the server is busy.';
      
      case APIErrorType.HTTP_ERROR:
        if (error.statusCode === 429) {
          return 'Too many requests. Please wait a moment and try again.';
        }
        if (error.statusCode === 500) {
          return 'Server error. Please try again later.';
        }
        return `Server error (${error.statusCode}). Please try again.`;
      
      case APIErrorType.INVALID_RESPONSE:
        return 'Received invalid response from server. The analysis may have failed.';
      
      case APIErrorType.PARSE_ERROR:
        return 'Failed to parse server response. Please try again.';
      
      default:
        return 'Analysis failed due to an unknown error.';
    }
  }
}
