import { LRUCache } from '../../LRUCache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3); // Small capacity for testing
  });

  test('should set and get values correctly', () => {
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  test('should update value when setting existing key', () => {
    cache.set('a', 1);
    cache.set('a', 2);
    expect(cache.get('a')).toBe(2);
  });

  test('should evict least recently used item when capacity is exceeded', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    // Cache is now full: a, b, c (in order of least to most recent usage)

    cache.get('a'); // Access 'a' to make it recently used
    // Order should now be: b, c, a

    cache.set('d', 4); // Should evict 'b'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('d')).toBe(4);
  });

  test('should handle deletion of existing and non-existing keys', () => {
    cache.set('a', 1);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();

    // Deleting non-existing key should not throw
    expect(() => cache.delete('nonexistent')).not.toThrow();
  });

  test('should clear all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  test('should return the correct size', () => {
    expect(cache.size()).toBe(0);
    cache.set('a', 1);
    expect(cache.size()).toBe(1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);
    cache.get('a'); // Access should not change size
    expect(cache.size()).toBe(2);
    cache.delete('a');
    expect(cache.size()).toBe(1);
  });

  test('should handle capacity of 1 correctly', () => {
    const singleCache = new LRUCache<string, number>(1);
    singleCache.set('a', 1);
    singleCache.set('b', 2); // Should evict 'a'
    expect(singleCache.get('a')).toBeUndefined();
    expect(singleCache.get('b')).toBe(2);
  });
});
