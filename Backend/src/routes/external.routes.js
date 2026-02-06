import express from 'express';
import externalController from '../controllers/external.controller.js';
import { strictRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Apply strict rate limiting to external API routes
// 10 requests per minute per IP
router.use(strictRateLimiter());

/**
 * GET /external/products
 * Fetches products from external API (fakestoreapi.com)
 * Uses OAuth2 token for authentication
 * Protected by circuit breaker
 */
router.get('/products', externalController.getProducts);

export default router;