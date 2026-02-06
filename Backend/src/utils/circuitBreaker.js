import { redisClient } from '../config/redis.js';

/**
 * Circuit Breaker Pattern Implementation
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 * 
 * Protects against cascading failures when external services are down.
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;  // Open after 5 failures
    this.resetTimeout = options.resetTimeout || 60000;      // Try again after 60s
    this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutes window
    
    this.keyPrefix = `circuit:${name}:`;
    this.stateKey = `${this.keyPrefix}state`;
    this.failureKey = `${this.keyPrefix}failures`;
    this.lastFailureKey = `${this.keyPrefix}lastFailure`;
  }

  /**
   * Executes a function with circuit breaker protection.
   * 
   * @param {Function} fn - Async function to execute
   * @returns {Promise} - Result of the function or circuit breaker error
   */
  async execute(fn) {
    const state = await this.getState();

    // Circuit is OPEN - fail fast
    if (state === 'OPEN') {
      const canRetry = await this.canAttemptReset();
      
      if (canRetry) {
        // Move to HALF_OPEN state
        await this.setState('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name}. Service unavailable.`);
      }
    }

    try {
      // Execute the function
      const result = await fn();

      // Success - reset failure count
      if (state === 'HALF_OPEN') {
        await this.close();
      } else {
        await this.recordSuccess();
      }

      return result;
    } catch (error) {
      // Record failure
      await this.recordFailure();

      const failureCount = await this.getFailureCount();

      // Open circuit if threshold exceeded
      if (failureCount >= this.failureThreshold) {
        await this.open();
      }

      throw error;
    }
  }

  /**
   * Gets the current circuit state.
   */
  async getState() {
    const state = await redisClient.get(this.stateKey);
    return state || 'CLOSED';
  }

  /**
   * Sets the circuit state.
   */
  async setState(state) {
    await redisClient.set(this.stateKey, state);
  }

  /**
   * Records a successful request.
   */
  async recordSuccess() {
    await redisClient.del(this.failureKey);
  }

  /**
   * Records a failed request.
   */
  async recordFailure() {
    const multi = redisClient.multi();
    multi.incr(this.failureKey);
    multi.set(this.lastFailureKey, Date.now().toString());
    multi.expire(this.failureKey, Math.ceil(this.monitoringPeriod / 1000));
    await multi.exec();
  }

  /**
   * Gets the current failure count.
   */
  async getFailureCount() {
    const count = await redisClient.get(this.failureKey);
    return count ? parseInt(count) : 0;
  }

  /**
   * Opens the circuit (stops requests).
   */
  async open() {
    console.warn(`⚠️  Circuit breaker OPEN for ${this.name}`);
    await this.setState('OPEN');
  }

  /**
   * Closes the circuit (resumes normal operation).
   */
  async close() {
    console.log(`✅ Circuit breaker CLOSED for ${this.name}`);
    await this.setState('CLOSED');
    await redisClient.del(this.failureKey);
  }

  /**
   * Checks if enough time has passed to attempt reset.
   */
  async canAttemptReset() {
    const lastFailure = await redisClient.get(this.lastFailureKey);
    
    if (!lastFailure) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - parseInt(lastFailure);
    return timeSinceLastFailure >= this.resetTimeout;
  }

  /**
   * Gets circuit breaker statistics.
   */
  async getStats() {
    const state = await this.getState();
    const failureCount = await this.getFailureCount();
    const lastFailure = await redisClient.get(this.lastFailureKey);

    return {
      name: this.name,
      state,
      failureCount,
      failureThreshold: this.failureThreshold,
      lastFailure: lastFailure ? new Date(parseInt(lastFailure)).toISOString() : null,
      resetTimeout: this.resetTimeout,
      monitoringPeriod: this.monitoringPeriod
    };
  }
}

export default CircuitBreaker;