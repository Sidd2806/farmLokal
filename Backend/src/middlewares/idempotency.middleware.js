import { pool } from '../config/database.js';


  // Idempotency middleware for webhooks.
  // Prevents duplicate event processing using event_id.
  
  // How it works:
  // - Extracts event_id from request body
  // - Checks if event already processed in database
  // - If duplicate: returns cached response
  // - If new: allows processing and stores result

  
export async function idempotencyMiddleware(req, res, next) {
  const eventId = req.body?.event_id;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Missing event_id in webhook payload'
    });
  }

  try {
    // Check if event already exists
    const [rows] = await pool.query(
      'SELECT id, status, processed_at FROM webhook_events WHERE event_id = ?',
      [eventId]
    );

    if (rows.length > 0) {
      const existingEvent = rows[0];

      // Event already processed successfully
      if (existingEvent.status === 'processed') {
        return res.status(200).json({
          success: true,
          message: 'Event already processed (idempotent response)',
          event_id: eventId,
          processed_at: existingEvent.processed_at
        });
      }

      // Event exists but failed - allow retry
      if (existingEvent.status === 'failed') {
        req.isRetry = true;
        req.existingEventId = existingEvent.id;
        return next();
      }

      // Event is currently being processed (pending)
      return res.status(409).json({
        success: false,
        message: 'Event is currently being processed',
        event_id: eventId
      });
    }

    // New event - insert as pending
    const [result] = await pool.query(
      `INSERT INTO webhook_events (event_id, event_type, payload, status) 
       VALUES (?, ?, ?, 'pending')`,
      [
        eventId,
        req.body.event_type || 'unknown',
        JSON.stringify(req.body)
      ]
    );

    req.eventDbId = result.insertId;
    next();
  } catch (error) {
    // Duplicate key error (race condition)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(200).json({
        success: true,
        message: 'Event already processed (duplicate detected)',
        event_id: eventId
      });
    }

    console.error('Idempotency check failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify event idempotency'
    });
  }
}