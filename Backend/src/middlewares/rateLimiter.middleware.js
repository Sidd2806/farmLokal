import { redisClient } from '../config/redis.js';

/**
 * Rate limiting middleware using Redis.
 * Implements sliding window algorithm for accurate rate limiting.
 * 
 * Default: 100 requests per 15 minutes per IP
 */
export function rateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,  // 15 minutes
    maxRequests = 100,           // Max requests per window
    keyPrefix = 'ratelimit:'
  } = options;

  return async (req, res, next) => {
    try {
      // Get client identifier (IP address)
      const clientId = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}${clientId}`;

      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set for sliding window
      const multi = redisClient.multi();

      // Remove old entries outside the current window
      multi.zRemRangeByScore(key, 0, windowStart);

      // Add current request with timestamp as score
      multi.zAdd(key, { score: now, value: `${now}` });

      // Count requests in current window
      multi.zCard(key);

      // Set expiry on the key
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const requestCount = results[2]; // zCard result

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount));
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      // Check if limit exceeded
      if (requestCount > maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);

        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: `${retryAfter} seconds`,
          limit: maxRequests,
          windowMs: windowMs
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow request to proceed (fail open)
      next();
    }
  };
}

/**
 * Strict rate limiter for sensitive endpoints.
 * 10 requests per minute.
 */
export function strictRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 10,
    keyPrefix: 'ratelimit:strict:'
  });
}

/**
 * Lenient rate limiter for public endpoints.
 * 1000 requests per hour.
 */
export function lenientRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 1000,
    keyPrefix: 'ratelimit:lenient:'
  });
}