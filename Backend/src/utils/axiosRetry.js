/**
 * Axios retry wrapper with exponential backoff.
 * Retries failed requests with increasing delays: 1s → 2s → 4s
 */
export async function axiosWithRetry(axiosConfig, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await axiosConfig();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) or if it's the last attempt
      if (
        error.response?.status >= 400 && 
        error.response?.status < 500 ||
        attempt === maxRetries - 1
      ) {
        break;
      }

      // Calculate exponential backoff: 2^attempt seconds
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // All retries failed
  throw lastError;
}