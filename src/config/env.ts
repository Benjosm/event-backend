/* 
 * Environment Configuration File
 * Centralizes access to environment variables with validation
 * Ensures credentials are not exposed in error messages
 */

// Export individual environment variables
export const TWITTER_BEARER_TOKEN = import.meta.env.VITE_TWITTER_BEARER_TOKEN;
export const GEOCODING_CACHE_CAPACITY = import.meta.env.VITE_GEOCODING_CACHE_CAPACITY
  ? parseInt(import.meta.env.VITE_GEOCODING_CACHE_CAPACITY, 10)
  : 100;

// Validate required environment variables on app start
if (!TWITTER_BEARER_TOKEN) {
  console.error('Missing required environment variable: VITE_TWITTER_BEARER_TOKEN');
  throw new Error('Configuration error');
}

// Validate parsed integer
if (isNaN(GEOCODING_CACHE_CAPACITY) || GEOCODING_CACHE_CAPACITY <= 0) {
  console.error('Invalid cache capacity: GEOCODING_CACHE_CAPACITY must be a positive integer');
  throw new Error('Configuration error');
}
