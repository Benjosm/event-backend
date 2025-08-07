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
});
