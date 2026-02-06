import express from "express";
import dotenv from 'dotenv';
dotenv.config();
import { testConnection } from './config/database.js';
import { connectRedis } from './config/redis.js';
import externalRoutes from './routes/external.routes.js';
import { initDatabase } from './config/init-db.js';
import webhookRoutes from './routes/webhook.routes.js';
import productRoutes from './routes/product.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import healthRoutes from "./routes/health.routes.js";

const app = express();
app.use(express.json());

app.use(healthRoutes);
app.use('/external', externalRoutes);
app.use('/webhook', webhookRoutes);
app.use('/products', productRoutes);
app.use('/metrics', metricsRoutes);

const PORT = process.env.PORT || 3000;

// Initialize connections and start server
const startServer = async () => {
  try {
    // Test MySQL connection
    await testConnection();
    
    // Initialize database tables
    await initDatabase();
    
    // Connect to Redis
    await connectRedis();
    
    // Routes
    app.use('/external', externalRoutes);
    app.use('/webhook', webhookRoutes);  // NEW
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();