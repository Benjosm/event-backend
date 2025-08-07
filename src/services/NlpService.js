/**
 * NlpService.js
 *
 * NLP pipeline using spaCy via Python service for tokenization,
 * part-of-speech tagging, and named entity recognition.
 *
 * Features:
 * - Tokenization
 * - POS tagging (e.g., Noun, Verb, ProperNoun)
 * - Named Entity Recognition (Person, Organization, Place, etc.)
 * - In-memory LRU caching for processed texts (configurable size)
 */

const axios = require('axios');
const { LRUCache } = require('./geocoding/LRUCache');

// Configure the Python NLP service URL
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:5000';
const NLP_ANALYZE_ENDPOINT = `${NLP_SERVICE_URL}/analyze`;

/**
 * A simple in-memory LRU (Least Recently Used) Cache implementation.
 * This cache stores key-value pairs with a maximum capacity.
 * When the capacity is exceeded, the least recently used item is removed.
 */
class LRUCache {
  constructor(capacity = 100) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

/**
 * Factory function to initialize and return the NLP processor.
 * Sets up the connection to the Python spaCy service.
 *
 * @returns {Object} The NLP processor with analyzeText method
 */
function createNlpPipeline() {
  // Validate connection to NLP service
  async function healthCheck() {
    try {
      // We don't need to make an actual request since the analyzeText function handles errors
      // The service will be validated on first use
      return true;
    } catch (err) {
      console.error('Failed to connect to NLP service:', err.message);
      throw err;
    }
  }

  // Perform initial health check
  healthCheck().catch(err => {
    console.warn('NLP service may not be available:', err.message);
  });

  return {
    analyzeText
  };
}

// Initialize pipeline
const nlpProcessor = createNlpPipeline();
const cache = new LRUCache(100);

/**
 * Processes a sentence and returns structured NLP results.
 * Uses LRU cache to avoid reprocessing identical texts.
 * Communicates with Python spaCy service via HTTP.
 *
 * @param {string} text - Input sentence
 * @returns {Promise<Object>} - Contains tokens, POS tags, and entities
 *
 * @example
 * const result = await analyzeText("John works at Google.");
 * console.log(result.tokens); // ['John', 'works', 'at', 'Google']
 * console.log(result.pos);    // { 'John': ['PROPN'], ... }
 * console.log(result.entities); // [{ text: 'John', type: 'PERSON' }, ...]
 */
async function analyzeText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text input must be a non-empty string');
  }

  // Try to get result from cache
  const cached = cache.get(text);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.post(NLP_ANALYZE_ENDPOINT, { text });
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    const result = {
      tokens: response.data.tokens,
      pos: response.data.pos,
      entities: response.data.entities
    };

    // Cache the result
    cache.set(text, result);

    return result;
  } catch (err) {
    if (err.response) {
      // Server responded with error status
      console.error('NLP service error:', err.response.status, err.response.data);
      throw new Error(`NLP analysis failed: ${err.response.data.error || 'Unknown error'}`);
    } else if (err.request) {
      // Request was made but no response received
      console.error('No response received from NLP service:', NLP_ANALYZE_ENDPOINT);
      throw new Error(`Cannot reach NLP service at ${NLP_ANALYZE_ENDPOINT}. Ensure the service is running.`);
    } else {
      // Something happened in setting up the request
      console.error('NLP analysis failed:', err.message);
      throw err;
    }
  }
}

// Test the pipeline on a sample sentence
(async function testNlpPipeline() {
  const testSentence = "John works at Google.";
  console.log('🔍 Testing NLP pipeline on:', testSentence);

  try {
    const result = await analyzeText(testSentence);
    console.log('✅ Tokens:', result.tokens);
    console.log('📌 POS Tags:', result.pos);
    console.log('🏷️  Entities:', result.entities);
  } catch (err) {
    console.error('❌ NLP test failed:', err.message);
  }
})();

module.exports = {
  createNlpPipeline,
  analyzeText
};
