import axios from 'axios';
import oAuthService from './oauth.service.js';
import { axiosWithRetry } from '../utils/axiosRetry.js';
import CircuitBreaker from '../utils/circuitBreaker.js';

const EXTERNAL_API_BASE = 'https://fakestoreapi.com';
const REQUEST_TIMEOUT = 3000; // 3 seconds

// Create circuit breaker for external API
const externalApiCircuitBreaker = new CircuitBreaker('fakestoreapi', {
  failureThreshold: 5,    // Open circuit after 5 failures
  resetTimeout: 30000,    // Try again after 30 seconds
  monitoringPeriod: 60000 // 1 minute monitoring window
});

/**
 * Service for calling protected external APIs.
 * Automatically handles OAuth token injection, retries, and circuit breaking.
 */
class ExternalApiService {
  /**
   * Fetches products from external API with OAuth authentication.
   * Includes timeout, retry logic, circuit breaker, and graceful error handling.
   */
  async getProducts() {
    try {
      // Use circuit breaker to protect against cascading failures
      const result = await externalApiCircuitBreaker.execute(async () => {
        // Get valid OAuth token (cached or refreshed)
        const accessToken = await oAuthService.getAccessToken();

        // Make API call with retry logic
        const response = await axiosWithRetry(
          () => axios.get(`${EXTERNAL_API_BASE}/products`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: REQUEST_TIMEOUT
          }),
          3 // max retries
        );

        return response.data;
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      // Check if error is due to circuit breaker
      if (error.message.includes('Circuit breaker is OPEN')) {
        return {
          success: false,
          error: 'External service temporarily unavailable',
          details: 'Circuit breaker is open. Service is experiencing issues.',
          circuitBreakerOpen: true
        };
      }

      // Graceful error handling - don't crash the app
      return this._handleError(error);
    }
  }

  /**
   * Gets circuit breaker statistics.
   */
  async getCircuitBreakerStats() {
    return await externalApiCircuitBreaker.getStats();
  }

  /**
   * Converts axios errors into user-friendly responses.
   * Never throws - always returns an object.
   */
  _handleError(error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'External API request timed out',
        details: 'The external service took too long to respond'
      };
    }

    if (error.response) {
      // API responded with error status
      return {
        success: false,
        error: 'External API returned an error',
        status: error.response.status,
        details: error.response.data?.message || 'Unknown error'
      };
    }

    if (error.request) {
      // Request made but no response
      return {
        success: false,
        error: 'No response from external API',
        details: 'The external service is unreachable'
      };
    }

    // Something else went wrong
    return {
      success: false,
      error: 'Failed to call external API',
      details: error.message
    };
  }
}

export default new ExternalApiService();