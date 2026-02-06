import { pool } from "../config/database.js";
import { redisClient } from "../config/redis.js";

// Cache product listings for 5 minutes. This balances:
// - Reducing DB queries during traffic spikes
// - Keeping prices reasonably fresh (acceptable for non-realtime use)
const CACHE_TTL = 300;
const CACHE_PREFIX = "products:list:";

//Product service for high-performance product listing.
 // Implements cursor-based pagination, search, filters, and caching.
class ProductService {

    // Get products with pagination, search, filters, and sorting.
    // Uses cursor-based pagination for better performance at scale.

  async getProducts(options = {}) {
    const {
      cursor = null, 
      limit = 20, 
      search = null, 
      category = null, 
      minPrice = null, 
      maxPrice = null, 
      sortBy = "created_at", 
      sortOrder = "desc",
    } = options;
    // Sanitize search term to prevent MySQL full-text syntax errors
    if (search && search.trim().length < 2) {
      search = null; // Ignore very short searches
    }
    if (minPrice && maxPrice && minPrice > maxPrice) {
      return res.status(400).json({
        message: "minPrice cannot be greater than maxPrice",
      });
    }
    // Generate cache key based on query parameters
    const cacheKey = this._generateCacheKey(options);

    try {
      // Try to get from cache
      const cachedResult = await redisClient.get(cacheKey);
      if (cachedResult) {
        console.log("✅ Cache hit:", cacheKey);
        return JSON.parse(cachedResult);
      }

      console.log("❌ Cache miss:", cacheKey);

      // Build query
      const queryResult = await this._buildAndExecuteQuery(options);

      // Cache the result
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(queryResult));

      return queryResult;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }

  // Builds and executes the SQL query with all filters and pagination.
  async _buildAndExecuteQuery(options) {
    const {
      cursor,
      limit,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = options;

    let query =
      "SELECT id, name, description, price, category, stock, created_at FROM products";
    const params = [];
    const whereClauses = [];

    // Cursor-based pagination (decode cursor)
    if (cursor) {
      const decodedCursor = this._decodeCursor(cursor);
      const operator = sortOrder === "asc" ? ">" : "<";

      if (sortBy === "price") {
        whereClauses.push(`price ${operator} ?`);
        params.push(decodedCursor.price);
      } else if (sortBy === "name") {
        whereClauses.push(`name ${operator} ?`);
        params.push(decodedCursor.name);
      } else {
        whereClauses.push(`created_at ${operator} ?`);
        params.push(decodedCursor.created_at);
      }
    }

    // Full-text search
    if (search) {
      whereClauses.push(
        "MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE)",
      );
      params.push(search);
    }

    // Category filter
    if (category) {
      whereClauses.push("category = ?");
      params.push(category);
    }

    // Price range filter
    if (minPrice !== null) {
      whereClauses.push("price >= ?");
      params.push(minPrice);
    }
    if (maxPrice !== null) {
      whereClauses.push("price <= ?");
      params.push(maxPrice);
    }

    // Add WHERE clause
    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    // Sorting
    const allowedSortFields = ["created_at", "price", "name"];
    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "created_at";
    const sortDirection = sortOrder === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortField} ${sortDirection}`;

    // Limit (fetch one extra to check if there's a next page)
    query += " LIMIT ?";
    params.push(parseInt(limit) + 1);

    // Execute query
    const [rows] = await pool.query(query, params);

    // Check if there's a next page
    const hasNextPage = rows.length > limit;
    const products = hasNextPage ? rows.slice(0, limit) : rows;

    // Generate next cursor
    let nextCursor = null;
    if (hasNextPage) {
      const lastProduct = products[products.length - 1];
      nextCursor = this._encodeCursor({
        id: lastProduct.id,
        price: lastProduct.price,
        name: lastProduct.name,
        created_at: lastProduct.created_at,
      });
    }

    return {
      success: true,
      data: products,
      pagination: {
        limit: parseInt(limit),
        nextCursor,
        hasNextPage,
      },
      meta: {
        count: products.length,
        cached: false,
      },
    };
  }

  // Encodes cursor for pagination.
  _encodeCursor(data) {
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }

//  Decodes cursor for pagination.
  _decodeCursor(cursor) {
    try {
      return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
    } catch (error) {
      throw new Error("Invalid cursor");
    }
  }

  //  Generates cache key based on query parameters.
  _generateCacheKey(options) {
    const {
      cursor,
      limit,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = options;

    const keyParts = [
      CACHE_PREFIX,
      `cursor:${cursor || "null"}`,
      `limit:${limit}`,
      `search:${search || "null"}`,
      `cat:${category || "null"}`,
      `minp:${minPrice || "null"}`,
      `maxp:${maxPrice || "null"}`,
      `sort:${sortBy}:${sortOrder}`,
    ];

    return keyParts.join("|");
  }

    // Invalidates all product list caches.
  //  Call this when products are created/updated/deleted.
  async invalidateCache() {
    try {
      const keys = await redisClient.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🗑️  Invalidated ${keys.length} cache entries`);
      }
    } catch (error) {
      console.error("Cache invalidation failed:", error);
    }
  }

  //   Get available categories for filtering.
  async getCategories() {
    const cacheKey = "products:categories";

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const [rows] = await pool.query(
        "SELECT DISTINCT category FROM products ORDER BY category",
      );

      const categories = rows.map((row) => row.category);
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(categories)); // Cache for 1 hour

      return categories;
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  }
}

export default new ProductService();
