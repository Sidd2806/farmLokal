import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("connect", () => {
  console.log("Redis Connected Successfully");
});

redisClient.on("error", (err) => {
  console.error(" Redis Connection Error:", err.message);
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error(" Redis Connection Failed:", err.message);
    process.exit(1);
  }
};
