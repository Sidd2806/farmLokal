import 'dotenv/config';
import { testConnection } from '../config/database.js';
import { initDatabase } from '../config/init-db.js';
import { seedProducts, clearProducts } from '../utils/seeder.js';
import { pool } from '../config/database.js';

/**
 * Database seeding script.
 * Usage:
 *   npm run seed          -> Seeds 1M products
 *   npm run seed 100000   -> Seeds 100k products
 *   npm run seed clear    -> Clears all products
 */
async function main() {
  try {
    await testConnection();
    await initDatabase();

    const arg = process.argv[2];

    if (arg === 'clear') {
      console.log('⚠️  Clearing all products...');
      await clearProducts();
    } else {
      const recordCount = arg ? parseInt(arg) : 1000000;
      await seedProducts(recordCount);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();