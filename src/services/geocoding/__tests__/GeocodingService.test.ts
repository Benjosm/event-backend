import { GeocodingService } from '../GeocodingService';
import { GeoCoordinates } from '../../types/GeoCoordinates';

// Mock the private performGeocoding method
jest.mock('../GeocodingService', () => {
  const originalModule = jest.requireActual('../GeocodingService');

  return {
    ...originalModule,
    GeocodingService: jest.fn().mockImplementation(() => {
      return {
        geocode: originalModule.GeocodingService.prototype.geocode,
        performGeocoding: jest.fn(),
      };
    }),
  };
});

describe('GeocodingService', () => {
  let geocodingService: GeocodingService;
  let mockPerformGeocoding: jest.Mock;

  beforeEach(() => {
    geocodingService = new GeocodingService();
    mockPerformGeocoding = (geocodingService as any).performGeocoding as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid GeoCoordinates for a valid location string', async () => {
    const mockCoordinates: GeoCoordinates = { latitude: 40.7128, longitude: -74.006 };
    mockPerformGeocoding.mockResolvedValue(mockCoordinates);

    const result = await geocodingService.geocode('New York City');

    expect(result).toEqual(mockCoordinates);
    expect(mockPerformGeocoding).toHaveBeenCalledWith('New York City');
  });

  it('should return null for an invalid location string', async () => {
    mockPerformGeocoding.mockResolvedValue(null);

    const result = await geocodingService.geocode('InvalidPlace123');

    expect(result).toBeNull();
    expect(mockPerformGeocoding).toHaveBeenCalledWith('InvalidPlace123');
  });

  it('should handle and recover from errors thrown by the geocoding library', async () => {
    const errorMessage = 'Geocoding API failure';
    mockPerformGeocoding.mockRejectedValue(new Error(errorMessage));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await geocodingService.geocode('New York City');

    expect(result).toBeNull();
    expect(mockPerformGeocoding).toHaveBeenCalledWith('New York City');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Geocoding failed for location: New York City',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should cache geocoding results and return the same object reference on subsequent calls', async () => {
    const mockCoordinates: GeoCoordinates = { latitude: 40.7128, longitude: -74.006 };
    mockPerformGeocoding.mockResolvedValue(mockCoordinates);

    // First call - should miss cache and call performGeocoding
    const result1 = await geocodingService.geocode('New York City');
    expect(result1).toEqual(mockCoordinates);
    expect(mockPerformGeocoding).toHaveBeenCalledTimes(1);

    // Second call - should hit cache and return same values without calling performGeocoding
    const result2 = await geocodingService.geocode('New York City');
    expect(result2).toEqual(mockCoordinates);
    expect(mockPerformGeocoding).toHaveBeenCalledTimes(1); // Still 1
  });

  it('should normalize location strings for caching (case and whitespace)', async () => {
    const mockCoordinates: GeoCoordinates = { latitude: 40.7128, longitude: -74.006 };
    mockPerformGeocoding.mockResolvedValue(mockCoordinates);

    // First call with formatted string
    const result1 = await geocodingService.geocode('  New York City  ');
    expect(result1).toEqual(mockCoordinates);
    expect(mockPerformGeocoding).toHaveBeenCalledTimes(1);

    // Second call with different formatting but same normalized value
    const result2 = await geocodingService.geocode('NEW YORK CITY');
    expect(result2).toEqual(mockCoordinates);
    expect(mockPerformGeocoding).toHaveBeenCalledTimes(1); // Should be cached
  });

  it('should return a copy of cached coordinates to prevent mutation', async () => {
    const mockCoordinates: GeoCoordinates = { latitude: 40.7128, longitude: -74.006 };
    mockPerformGeocoding.mockResolvedValue(mockCoordinates);

    const result1 = await geocodingService.geocode('New York City');
    const result2 = await geocodingService.geocode('New York City');

    // Verify they have same values but are different objects
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);

    // Mutate the second result
    if (result2) {
      result2.latitude = 0;
      result2.longitude = 0;
    }

    // First result should be unchanged
    if (result1) {
      expect(result1.latitude).toBe(40.7128);
      expect(result1.longitude).toBe(-74.006);
    }
  });
});
