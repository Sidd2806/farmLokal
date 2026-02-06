import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  },
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('connect', () => {
  console.log('✅ Redis Connected Successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Redis Connection Failed:', error.message);
    process.exit(1);
  }
};

export { redisClient, connectRedis };