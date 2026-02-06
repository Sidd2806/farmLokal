import externalApiService from '../services/externalApi.service.js';

/**
 * Controller for external API endpoints.
 * Thin layer - delegates all logic to service.
 */
class ExternalController {
  /**
   * GET /external/products
   * Fetches products from external API with OAuth authentication.
   */
  async getProducts(req, res) {
    try {
      const result = await externalApiService.getProducts();

      if (result.success) {
        return res.status(200).json({
          success: true,
          data: result.data
        });
      }

      // Service returned graceful error
      return res.status(503).json({
        success: false,
        message: result.error,
        details: result.details
      });
    } catch (error) {
      // Unexpected error (shouldn't happen due to service error handling)
      console.error('Unexpected error in getProducts controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new ExternalController();