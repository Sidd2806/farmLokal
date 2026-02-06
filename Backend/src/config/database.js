import mysql from "mysql2/promise";

const isProduction = process.env.NODE_ENV === "production";

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: isProduction
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },

  waitForConnections: true,
  connectionLimit: 10,
});


// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL Connected Successfully");
    connection.release();
  } catch (error) {
    console.error("MySQL Connection Failed:", error.message);
    process.exit(1);
  }
};

export { pool, testConnection };
