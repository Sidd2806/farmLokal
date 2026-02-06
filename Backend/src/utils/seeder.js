import { pool } from '../config/database.js';

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Books',
  'Toys',
  'Food & Beverage',
  'Beauty',
  'Automotive',
  'Health'
];

const NAME_PREFIXES = [
  'Premium', 'Deluxe', 'Professional', 'Ultra', 'Smart', 'Classic', 
  'Modern', 'Vintage', 'Eco-Friendly', 'Luxury', 'Basic', 'Advanced'
];

const PRODUCT_TYPES = [
  'Widget', 'Gadget', 'Tool', 'Device', 'Kit', 'Set', 'Bundle',
  'Package', 'System', 'Unit', 'Item', 'Product', 'Accessory'
];

/**
 * Generates a random product name.
 */
function generateProductName(index) {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const type = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)];
  return `${prefix} ${type} ${index}`;
}

/**
 * Generates a random description.
 */
function generateDescription(name, category) {
  const descriptions = [
    `High-quality ${name.toLowerCase()} perfect for ${category.toLowerCase()} enthusiasts.`,
    `Best-selling ${name.toLowerCase()} with excellent customer reviews.`,
    `Durable ${name.toLowerCase()} designed for long-lasting performance.`,
    `Top-rated ${name.toLowerCase()} at an affordable price.`,
    `Essential ${name.toLowerCase()} for your ${category.toLowerCase()} needs.`
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Generates a random price between min and max.
 */
function generatePrice(min = 5, max = 1000) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

/**
 * Seeds the database with fake product data.
 * Uses batch inserts for performance (1000 records per query).
 */
export async function seedProducts(totalRecords = 1000000) {
  const BATCH_SIZE = 1000;
  const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

  console.log(`🌱 Starting database seeding: ${totalRecords.toLocaleString()} products`);
  console.log(`📦 Batch size: ${BATCH_SIZE} | Total batches: ${totalBatches}`);

  // Check if products already exist
  const [countResult] = await pool.query('SELECT COUNT(*) as count FROM products');
  const existingCount = countResult[0].count;

  if (existingCount >= totalRecords) {
    console.log(`✅ Database already contains ${existingCount.toLocaleString()} products. Skipping seeding.`);
    return;
  }

  const startTime = Date.now();

  try {
    for (let batch = 0; batch < totalBatches; batch++) {
      const values = [];
      const recordsInBatch = Math.min(BATCH_SIZE, totalRecords - (batch * BATCH_SIZE));

      // Generate batch of products
      for (let i = 0; i < recordsInBatch; i++) {
        const index = batch * BATCH_SIZE + i + 1;
        const name = generateProductName(index);
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const description = generateDescription(name, category);
        const price = generatePrice();
        const stock = Math.floor(Math.random() * 500);

        values.push([name, description, price, category, stock]);
      }

      // Batch insert
      const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(',');
      const flatValues = values.flat();

      await pool.query(
        `INSERT INTO products (name, description, price, category, stock) 
         VALUES ${placeholders}`,
        flatValues
      );

      // Progress logging
      const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
      const recordsInserted = (batch + 1) * BATCH_SIZE;
      console.log(`📊 Progress: ${progress}% (${Math.min(recordsInserted, totalRecords).toLocaleString()} / ${totalRecords.toLocaleString()} records)`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Seeding completed in ${duration}s`);
    console.log(`📈 Average: ${(totalRecords / duration).toFixed(0)} records/second`);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
}

/**
 * Clears all products from database (use with caution).
 */
export async function clearProducts() {
  await pool.query('TRUNCATE TABLE products');
  console.log('🗑️  All products cleared');
}