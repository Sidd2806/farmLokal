import { pool } from './database.js';

/**
 * Initializes database tables with proper indexes for performance.
 */
export async function initDatabase() {
  try {
    // Create webhook_events table (existing)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSON NOT NULL,
        status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
        retry_count INT DEFAULT 0,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_event_id (event_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create products table with optimized indexes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Performance indexes for filtering and sorting
        INDEX idx_category (category),
        INDEX idx_price (price),
        INDEX idx_created_at (created_at),
        INDEX idx_category_price (category, price),
        INDEX idx_name (name),
        
        -- Full-text search index for name and description
        FULLTEXT INDEX ft_name_desc (name, description)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
}