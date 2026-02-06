import express from 'express';
import metricsController from '../controllers/metrics.controller.js';

const router = express.Router();

/**
 * GET /metrics
 * System metrics and monitoring data.
 */
router.get('/', metricsController.getMetrics);

/**
 * GET /health
 * Health check endpoint for load balancers.
 */
router.get('/health', metricsController.healthCheck);

export default router;