/**
 * LRUCache - A simple in-memory LRU (Least Recently Used) cache for geocoding results.
 * Uses JavaScript Map to store key-value pairs, where Map's iteration order is insertion order.
 * By re-setting keys on get/put, we ensure recently used items are moved to the end.
 * When capacity is exceeded, the first item (least recently used) is evicted.
 */
export class LRUCache {
  private cache: Map<string, { lat: number; lon: number }>;
  private capacity: number;

  constructor(capacity: number) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  /**
   * Get the value (coordinates) for the given key.
   * If the key exists, move it to the end (most recently used) and return its value.
   * Otherwise, return null.
   */
  get(key: string): { lat: number; lon: number } | null {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      // Delete and re-set to mark as recently used
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  /**
   * Put a key-value pair into the cache.
   * If the key exists, update it and mark as recently used.
   * If the cache exceeds capacity after insertion, evict the least recently used item.
   */
  put(key: string, value: { lat: number; lon: number }): void {
    // If key exists, delete it first so we can re-insert at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // If adding new key and cache is at capacity, remove least recently used (first item)
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Insert the new or updated entry (at the end)
    this.cache.set(key, value);
  }
}
