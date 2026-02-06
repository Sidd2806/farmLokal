import axios from 'axios';
import { pool } from '../config/database.js';

const WEBHOOK_REGISTER_URL = 'https://mock-external-service.com/register-webhook';
const CALLBACK_BASE_URL = process.env.CALLBACK_BASE_URL || 'http://localhost:3000';

/**
 * Webhook service for handling async event processing.
 * Implements idempotency, retry logic, and callback registration.
 */
class WebhookService {
  /**
   * Registers webhook callback URL with external service.
   * In production, this would be called during app startup.
   */
  async registerWebhook() {
    try {
      const callbackUrl = `${CALLBACK_BASE_URL}/webhook/callback`;
      
      const response = await axios.post(
        WEBHOOK_REGISTER_URL,
        {
          callback_url: callbackUrl,
          events: ['order.created', 'order.updated', 'payment.completed']
        },
        { timeout: 5000 }
      );

      console.log('✅ Webhook registered:', callbackUrl);
      return { success: true, callback_url: callbackUrl };
    } catch (error) {
      // Mock registration since URL is fake
      console.log('⚠️  Mock webhook registration (external service unavailable)');
      return {
        success: true,
        callback_url: `${CALLBACK_BASE_URL}/webhook/callback`,
        mock: true
      };
    }
  }

  /**
   * Processes incoming webhook event.
   * Business logic for handling different event types.
   */
  async processEvent(eventData, eventDbId, isRetry = false) {
    try {
      const { event_id, event_type, data } = eventData;

      // Increment retry count if this is a retry
      if (isRetry) {
        await pool.query(
          'UPDATE webhook_events SET retry_count = retry_count + 1 WHERE id = ?',
          [eventDbId]
        );
      }

      // Process based on event type
      let processedData;
      switch (event_type) {
        case 'order.created':
          processedData = await this._handleOrderCreated(data);
          break;
        case 'order.updated':
          processedData = await this._handleOrderUpdated(data);
          break;
        case 'payment.completed':
          processedData = await this._handlePaymentCompleted(data);
          break;
        default:
          processedData = { message: 'Event type not handled', data };
      }

      // Mark event as processed
      await pool.query(
        `UPDATE webhook_events 
         SET status = 'processed', processed_at = NOW() 
         WHERE id = ?`,
        [eventDbId]
      );

      return {
        success: true,
        event_id,
        processed_data: processedData
      };
    } catch (error) {
      // Mark event as failed
      await pool.query(
        `UPDATE webhook_events 
         SET status = 'failed' 
         WHERE id = ?`,
        [eventDbId]
      );

      throw error;
    }
  }

  /**
   * Business logic for order.created event.
   */
  async _handleOrderCreated(data) {
    // Example: Create order in database, send confirmation email, etc.
    console.log('📦 Processing order.created:', data.order_id);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      order_id: data.order_id,
      status: 'confirmed',
      processed: true
    };
  }

  /**
   * Business logic for order.updated event.
   */
  async _handleOrderUpdated(data) {
    console.log('🔄 Processing order.updated:', data.order_id);
    
    return {
      order_id: data.order_id,
      status: 'updated',
      processed: true
    };
  }

  /**
   * Business logic for payment.completed event.
   */
  async _handlePaymentCompleted(data) {
    console.log('💳 Processing payment.completed:', data.payment_id);
    
    return {
      payment_id: data.payment_id,
      status: 'captured',
      processed: true
    };
  }

  /**
   * Retrieves all webhook events with optional filtering.
   */
  async getEvents(filters = {}) {
    const { status, limit = 50, offset = 0 } = filters;

    let query = 'SELECT * FROM webhook_events';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }
}

export default new WebhookService();