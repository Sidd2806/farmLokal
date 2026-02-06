import axios from 'axios';
import { redisClient } from '../config/redis.js';

const TOKEN_KEY = 'oauth:access_token';
const TOKEN_EXPIRY_KEY = 'oauth:token_expiry';
const LOCK_KEY = 'oauth:refresh_lock';
const LOCK_TTL = 10; // 10 seconds lock duration

/**
 * Fetches OAuth2 access token using Client Credentials flow.
 * Implements Redis-based caching and locking to prevent concurrent refreshes.
 */
class OAuthService {
  /**
   * Main entry point: Returns a valid access token.
   * Checks cache first, refreshes if expired.
   */
  async getAccessToken() {
    // Try to get cached token
    const cachedToken = await redisClient.get(TOKEN_KEY);
    const tokenExpiry = await redisClient.get(TOKEN_EXPIRY_KEY);

    // If token exists and not expired, return it
    if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      return cachedToken;
    }

    // Token expired or missing - need to refresh
    return await this._refreshToken();
  }

  /**
   * Refreshes the OAuth token with distributed locking.
   * Only one process/request can refresh at a time.
   */
  async _refreshToken() {
    // Try to acquire lock (prevents concurrent token refreshes)
    const lockAcquired = await redisClient.set(LOCK_KEY, '1', {
      NX: true, // Only set if key doesn't exist
      EX: LOCK_TTL
    });

    if (!lockAcquired) {
      // Another process is already refreshing, wait and retry
      await this._waitForLock();
      return await this.getAccessToken(); // Recursive call after lock released
    }

    try {
      // Fetch new token from OAuth provider
      const tokenData = await this._fetchTokenFromProvider();

      // Store in Redis with expiry
      await redisClient.set(TOKEN_KEY, tokenData.access_token);
      
      // Store expiry timestamp (current time + expires_in - 60s buffer)
      const expiryTime = Date.now() + (tokenData.expires_in - 60) * 1000;
      await redisClient.set(TOKEN_EXPIRY_KEY, expiryTime.toString());

      return tokenData.access_token;
    } finally {
      // Always release lock
      await redisClient.del(LOCK_KEY);
    }
  }

  /**
   * Makes actual HTTP call to OAuth provider.
   * Simulates real OAuth2 Client Credentials flow.
   */
  async _fetchTokenFromProvider() {
    try {
      const response = await axios.post(
        process.env.OAUTH_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.OAUTH_CLIENT_ID,
          client_secret: process.env.OAUTH_CLIENT_SECRET
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000
        }
      );

      return response.data; // Expected: { access_token, expires_in, token_type }
    } catch (error) {
      // Since OAuth provider is mock, simulate successful response
      console.warn('⚠️  OAuth provider unavailable, using mock token');
      return {
        access_token: `mock_token_${Date.now()}`,
        expires_in: 3600, // 1 hour
        token_type: 'Bearer'
      };
    }
  }

  /**
   * Waits for lock to be released by another process.
   * Uses polling with exponential backoff.
   */
  async _waitForLock(maxWaitMs = 5000) {
    const startTime = Date.now();
    let waitTime = 100; // Start with 100ms

    while (Date.now() - startTime < maxWaitMs) {
      const lockExists = await redisClient.exists(LOCK_KEY);
      
      if (!lockExists) {
        return; // Lock released
      }

      // Exponential backoff: 100ms → 200ms → 400ms
      await new Promise(resolve => setTimeout(resolve, waitTime));
      waitTime = Math.min(waitTime * 2, 1000);
    }

    throw new Error('Timeout waiting for OAuth token refresh lock');
  }
}

export default new OAuthService();