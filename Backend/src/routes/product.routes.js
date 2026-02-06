import express from 'express';
import productController from '../controllers/product.controller.js';
import { rateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Apply rate limiting to all product routes
// 100 requests per 15 minutes per IP
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100
}));

/**
 * GET /products
 * List products with pagination, search, filters, and sorting.
 */
router.get('/', productController.getProducts);

/**
 * GET /products/categories
 * Get all available product categories.
 */
router.get('/categories', productController.getCategories);

export default router;