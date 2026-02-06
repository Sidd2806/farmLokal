import express from 'express';
import webhookController from '../controllers/webhook.controller.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware.js';

const router = express.Router();

//   POST /webhook/callback
//   Receives webhook events from external service.
//   Protected by idempotency middleware.
 
router.post('/callback', idempotencyMiddleware, webhookController.handleCallback);


//   POST /webhook/register
//  Manually register webhook with external service.
router.post('/register', webhookController.register);

//   GET /webhook/events
//  Retrieve all webhook events (for monitoring/debugging).
//  Query params: ?status=processed&limit=10&offset=0

router.get('/events', webhookController.getEvents);

export default router;