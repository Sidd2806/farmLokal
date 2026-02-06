import webhookService from '../services/webhook.service.js';

/**
 * Controller for webhook endpoints.
 */
class WebhookController {
  /**
   * POST /webhook/callback
   * Receives webhook events from external service.
   * Idempotency handled by middleware.
   */
  async handleCallback(req, res) {
    try {
      const eventData = req.body;
      const eventDbId = req.eventDbId;
      const isRetry = req.isRetry || false;

      // Process the event
      const result = await webhookService.processEvent(
        eventData,
        eventDbId,
        isRetry
      );

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        event_id: result.event_id,
        data: result.processed_data
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to process webhook',
        error: error.message
      });
    }
  }

  /**
   * POST /webhook/register
   * Manually register webhook with external service.
   */
  async register(req, res) {
    try {
      const result = await webhookService.registerWebhook();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Webhook registration error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to register webhook'
      });
    }
  }

  /**
   * GET /webhook/events
   * Retrieve webhook events for monitoring.
   */
  async getEvents(req, res) {
    try {
      const { status, limit, offset } = req.query;
      
      const events = await webhookService.getEvents({
        status,
        limit,
        offset
      });

      return res.status(200).json({
        success: true,
        count: events.length,
        events
      });
    } catch (error) {
      console.error('Failed to retrieve events:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve webhook events'
      });
    }
  }
}

export default new WebhookController();