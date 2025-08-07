import { GeoCoordinates } from '../../types/GeoCoordinates';
import { LRUCache } from './LRUCache';
import config from '../../config/env';

/**
 * Service to handle geocoding of location strings into geographic coordinates.
 */
export class GeocodingService {
  private cache: LRUCache<string, GeoCoordinates>;

  constructor() {
    const cacheCapacity = config.GEOCODING_CACHE_CAPACITY || 100;
    this.cache = new LRUCache<string, GeoCoordinates>(cacheCapacity);
  }

  /**
   * Resolves a location string into geographic coordinates.
   *
   * @param locationString - The location string to geocode.
   * @returns A promise that resolves to the GeoCoordinates if successful, or null if the location cannot be determined.
   */
  async geocode(locationString: string): Promise<GeoCoordinates | null> {
    // Validate input
    if (!locationString || typeof locationString !== 'string') {
      return null;
    }

    // Normalize location string for consistent caching
    const normalizedLocation = locationString.trim().toLowerCase();

    // Check cache first
    const cachedResult = this.cache.get(normalizedLocation);
    if (cachedResult) {
      return { ...cachedResult }; // Return a copy to prevent mutation
    }

    // Cache miss: perform external geocoding
    try {
      const result = await this.performGeocoding(normalizedLocation);
      if (result) {
        // Store in cache for future requests
        this.cache.set(normalizedLocation, { ...result });
      }
      return result;
    } catch (error) {
      console.error(`Geocoding failed for location: ${locationString}`, error);
      return null;
    }
  }

  /**
   * Simulates the actual geocoding operation using a geocoding library.
   * This should be replaced with integration to the real geocoding library.
   *
   * @param locationString - The location string to resolve.
   * @returns A promise that resolves to GeoCoordinates or null.
   */
  private async performGeocoding(locationString: string): Promise<GeoCoordinates | null> {
    // This is where the custom geocoding library would be used.
    // As a placeholder, we return mock coordinates for non-empty strings.
    if (!locationString || typeof locationString !== 'string') {
      return null;
    }

    // Mock response - in real implementation, this would come from a geocoding library
    return {
      latitude: 40.7128 + Math.random() * 0.01, // Simulate slight variation
      longitude: -74.006 + Math.random() * 0.01,
    };
  }
}
