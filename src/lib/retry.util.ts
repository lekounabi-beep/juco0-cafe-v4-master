/**
 * Retry utility for failed API calls
 * Implements exponential backoff with configurable max retries
 */

type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
};

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors and 5xx server errors
    if (!error) return false;
    
    // Network errors (no response)
    if (!error.response) return true;
    
    // 5xx server errors
    const status = error.response?.status || error.status;
    if (status >= 500 && status < 600) return true;
    
    // 408 Request Timeout
    if (status === 408) return true;
    
    // 429 Too Many Requests
    if (status === 429) return true;
    
    return false;
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      console.warn(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed:`, error.message);
      
      // Check if we should retry
      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        console.error('[Retry] Max retries reached or error not retryable');
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );
      
      console.log(`[Retry] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with jitter to avoid thundering herd problem
 */
export async function withRetryJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      console.warn(`[RetryJitter] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed:`, error.message);
      
      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        console.error('[RetryJitter] Max retries reached or error not retryable');
        throw error;
      }
      
      // Calculate delay with exponential backoff and random jitter
      const baseDelay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );
      const jitter = baseDelay * 0.1 * Math.random(); // 10% jitter
      const delay = baseDelay + jitter;
      
      console.log(`[RetryJitter] Retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private isOpen: boolean = false;
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.isOpen = false;
        this.failures = 0;
        console.log('[CircuitBreaker] Circuit reset');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.isOpen = true;
        console.error('[CircuitBreaker] Circuit opened due to too many failures');
      }
      
      throw error;
    }
  }
  
  reset() {
    this.failures = 0;
    this.isOpen = false;
    console.log('[CircuitBreaker] Circuit manually reset');
  }
  
  getState() {
    return {
      isOpen: this.isOpen,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
