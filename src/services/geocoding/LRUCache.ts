/**
 * A simple in-memory LRU (Least Recently Used) Cache implementation.
 * This cache stores key-value pairs with a maximum capacity.
 * When the capacity is exceeded, the least recently used item is removed.
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private capacity: number;

  constructor(capacity: number = 100) {
    this.capacity = capacity;
  }

  /**
   * Retrieves a value by its key.
   * Moves the accessed item to the 'most recently used' position.
   *
   * @param key - The key to retrieve.
   * @returns The value if found; otherwise undefined.
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Delete and re-insert to mark as most recently used
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * Inserts or updates a key-value pair.
   * If the cache exceeds capacity, the least recently used item is removed.
   *
   * @param key - The key to set.
   * @param value - The value to store.
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove the first (least recently used) entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
   * Removes a key from the cache.
   * @param key - The key to delete.
   */
  delete(key: K): void {
    this.cache.delete(key);
  }

  /**
   * Clears all entries in the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the current size of the cache.
   */
  size(): number {
    return this.cache.size;
  }
}
