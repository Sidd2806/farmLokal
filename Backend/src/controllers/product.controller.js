import productService from '../services/product.service.js';

/**
 * Controller for product endpoints.
 */
class ProductController {
  /**
   * GET /products
   * List products with pagination, search, filters, and sorting.
   */
  async getProducts(req, res) {
    try {
      const {
        cursor,
        limit = 20,
        search,
        category,
        minPrice,
        maxPrice,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      // Validate limit
      const parsedLimit = parseInt(limit);
      if (parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 100'
        });
      }

      // Validate sort parameters
      const allowedSortFields = ['created_at', 'price', 'name'];
      if (!allowedSortFields.includes(sortBy)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sortBy field. Allowed: created_at, price, name'
        });
      }

      const allowedSortOrders = ['asc', 'desc'];
      if (!allowedSortOrders.includes(sortOrder)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sortOrder. Allowed: asc, desc'
        });
      }

      const result = await productService.getProducts({
        cursor,
        limit: parsedLimit,
        search,
        category,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        sortBy,
        sortOrder
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getProducts controller:', error);
      
      if (error.message === 'Invalid cursor') {
        return res.status(400).json({
          success: false,
          message: 'Invalid cursor parameter'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products'
      });
    }
  }

  /**
   * GET /products/categories
   * Get all available categories.
   */
  async getCategories(req, res) {
    try {
      const categories = await productService.getCategories();
      
      return res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error in getCategories controller:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  }
}

export default new ProductController();