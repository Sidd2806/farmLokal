import externalApiService from '../services/externalApi.service.js';
import { pool } from '../config/database.js';
import { redisClient } from '../config/redis.js';

/**
 * Controller for monitoring and metrics endpoints.
 */
class MetricsController {
  /**
   * GET /metrics
   * Returns system health and performance metrics.
   */
  async getMetrics(req, res) {
    try {
      // Database stats
      const [dbStats] = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM products) as total_products,
          (SELECT COUNT(*) FROM webhook_events) as total_webhooks,
          (SELECT COUNT(*) FROM webhook_events WHERE status = 'processed') as processed_webhooks,
          (SELECT COUNT(*) FROM webhook_events WHERE status = 'failed') as failed_webhooks
      `);

      // Redis info
      const redisInfo = await redisClient.info('stats');
      const redisKeys = await redisClient.dbSize();

      // Circuit breaker stats
      const circuitBreakerStats = await externalApiService.getCircuitBreakerStats();

      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbStats[0],
        redis: {
          totalKeys: redisKeys,
          connected: redisClient.isOpen
        },
        circuitBreaker: circuitBreakerStats
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch metrics'
      });
    }
  }

  /**
   * GET /health
   * Simple health check endpoint.
   */
  async healthCheck(req, res) {
    try {
      // Test database connection
      await pool.query('SELECT 1');
      
      // Test Redis connection
      await redisClient.ping();

      return res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

export default new MetricsController();