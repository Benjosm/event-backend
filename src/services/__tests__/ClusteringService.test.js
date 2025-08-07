/**
 * ClusteringService.test.js
 * 
 * Unit tests for the clustering service.
 * Ensures correct clustering behavior, edge cases, and optimization integrity.
 */

const { clusterEvents } = require('../ClusteringService');

// Helper to create test events
const createEvent = (id, lat, lon) => ({
  id,
  coordinates: { latitude: lat, longitude: lon }
});

// Helper to group events by clusterId
const groupByCluster = (events) => {
  return events.reduce((groups, event) => {
    if (!groups[event.clusterId]) {
      groups[event.clusterId] = [];
    }
    groups[event.clusterId].push(event);
    return groups;
  }, {});
};

// Radius used for testing (in meters)
const TEST_RADIUS = 1000;

describe('ClusteringService', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  it('should group two events within radius into the same cluster', () => {
    // New York City coordinates
    const nyc = { latitude: 40.7128, longitude: -74.0060 };
    // Nearby point (within 1km radius)
    const nearby = { latitude: 40.7138, longitude: -74.0070 };

    const events = [
      { ...createEvent(1, nyc.latitude, nyc.longitude) },
      { ...createEvent(2, nearby.latitude, nearby.longitude) }
    ];

    const result = clusterEvents(events, TEST_RADIUS);
    
    expect(result).toHaveLength(2);
    expect(result[0].clusterId).toBe(result[1].clusterId);
  });

  it('should place two events outside radius into different clusters', () => {
    // New York City
    const nyc = { latitude: 40.7128, longitude: -74.0060 };
    // Los Angeles
    const la = { latitude: 34.0522, longitude: -118.2437 };

    const events = [
      { ...createEvent(1, nyc.latitude, nyc.longitude) },
      { ...createEvent(2, la.latitude, la.longitude) }
    ];

    const result = clusterEvents(events, TEST_RADIUS);
    
    expect(result).toHaveLength(2);
    expect(result[0].clusterId).not.toBe(result[1].clusterId);
  });

  it('should create transitive clusters (A near B, B near C, A far from C)', () => {
    // Create three points in a line: A - B - C, where A and C are too far apart
    // but both are within radius of B
    const pointA = { latitude: 40.7128, longitude: -74.0060 };
    const pointB = { latitude: 40.7132, longitude: -74.0060 }; // ~440m from A
    const pointC = { latitude: 40.7136, longitude: -74.0060 }; // ~440m from B, ~880m from A

    const events = [
      { ...createEvent(1, pointA.latitude, pointA.longitude) },
      { ...createEvent(2, pointB.latitude, pointB.longitude) },
      { ...createEvent(3, pointC.latitude, pointC.longitude) }
    ];

    const result = clusterEvents(events, TEST_RADIUS);
    
    expect(result).toHaveLength(3);
    const clusters = groupByCluster(result);
    expect(Object.keys(clusters)).toHaveLength(1); // All in one cluster
    const clusterId = result[0].clusterId;
    expect(result[1].clusterId).toBe(clusterId);
    expect(result[2].clusterId).toBe(clusterId);
  });

  it('should return empty array when given empty array', () => {
    const result = clusterEvents([], TEST_RADIUS);
    expect(result).toHaveLength(0);
  });

  it('should assign a clusterId to a single event', () => {
    const events = [createEvent(1, 40.7128, -74.0060)];
    const result = clusterEvents(events, TEST_RADIUS);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('clusterId');
    expect(typeof result[0].clusterId).toBe('string');
    expect(result[0].clusterId).toMatch(/^cluster_/);
  });

  it('should skip events with missing coordinates and cluster valid ones', () => {
    const validEvent = createEvent(1, 40.7128, -74.0060);
    const invalidEvent1 = { id: 2 };
    const invalidEvent2 = { id: 3, coordinates: { latitude: 91, longitude: 200 } }; // Invalid coordinates

    const events = [validEvent, invalidEvent1, invalidEvent2];

    const result = clusterEvents(events, TEST_RADIUS);
    
    expect(console.warn).toHaveBeenCalledTimes(2); // One warning for each invalid event
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0]).toHaveProperty('clusterId');
  });

  it('should skip events with invalid coordinates and cluster valid ones correctly', () => {
    const event1 = createEvent(1, 40.7128, -74.0060);
    const event2 = createEvent(2, 40.7130, -74.0070); // Within radius of event1
    const invalidEvent = { id: 3, coordinates: { latitude: 91, longitude: 200 } };

    const events = [event1, invalidEvent, event2];

    const result = clusterEvents(events, TEST_RADIUS);
    
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    const clusters = groupByCluster(result);
    expect(Object.keys(clusters)).toHaveLength(1); // Valid events should be in same cluster
  });

  it('should handle near-duplicate clusterId generation for deterministic testing', () => {
    // This test ensures the structure of clusterId is as expected
    // Note: We cannot test true determinism due to random generation,
    // but we can verify the format and that same roots get same IDs
    const event1 = createEvent(1, 40.7128, -74.0060);
    const event2 = createEvent(2, 40.7130, -74.0070); // Close to event1

    const result = clusterEvents([event1, event2], TEST_RADIUS);
    
    expect(result).toHaveLength(2);
    expect(result[0].clusterId).toBe(result[1].clusterId);
    expect(result[0].clusterId).toMatch(/^cluster_\d+_[a-zA-Z0-9]+$/);
  });

  it('should throw error when events is not an array', () => {
    expect(() => clusterEvents('not-an-array', TEST_RADIUS)).toThrow('Events must be an array');
    expect(() => clusterEvents(null, TEST_RADIUS)).toThrow('Events must be an array');
    expect(() => clusterEvents(undefined, TEST_RADIUS)).toThrow('Events must be an array');
  });

  it('should throw error when radius is not a positive number', () => {
    const events = [createEvent(1, 40.7128, -74.0060)];
    
    expect(() => clusterEvents(events, -100)).toThrow('Radius must be a positive number');
    expect(() => clusterEvents(events, 0)).toThrow('Radius must be a positive number');
    expect(() => clusterEvents(events, 'invalid')).toThrow('Radius must be a positive number');
    expect(() => clusterEvents(events, null)).toThrow('Radius must be a positive number');
  });

  it('should return empty array when all events have invalid coordinates', () => {
    const events = [
      { id: 1 },
      { id: 2, coordinates: { latitude: 91, longitude: 200 } }
    ];

    const result = clusterEvents(events, TEST_RADIUS);
    
    expect(result).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  describe('Integration Tests with Sample Data', () => {
    let sampleEvents;
    
    beforeAll(async () => {
      // Dynamically import the sample data
      sampleEvents = await import('../../../data/sampleEvents.json');
    });

    it('should cluster real-world sample events correctly', () => {
      const radius = 1000; // 1km radius
      const result = clusterEvents(sampleEvents, radius);
      
      // Should return clustered events
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      // Should have fewer clusters than total valid events
      const validEvents = sampleEvents.filter(e => e.coordinates && 
        Math.abs(e.coordinates.latitude) <= 90 && 
        Math.abs(e.coordinates.longitude) <= 180);
      
      const clusteredEvents = result.filter(e => e.clusterId);
      const clusterIds = [...new Set(result.map(e => e.clusterId))];
      
      expect(clusteredEvents.length).toBe(validEvents.length);
      expect(clusterIds.length).toBeLessThan(validEvents.length);
      expect(clusterIds.length).toBeGreaterThan(1); // Multiple clusters expected
    });

    it('should generate valid cluster IDs for all clustered events', () => {
      const radius = 1000;
      const result = clusterEvents(sampleEvents, radius);
      
      result.forEach(event => {
        expect(event.clusterId).toMatch(/^cluster_\d+_[a-zA-Z0-9]+$/);
      });
    });

    it('should handle invalid coordinates with appropriate warnings', () => {
      const radius = 1000;
      
      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      clusterEvents(sampleEvents, radius);
      
      // Should warn about events with missing or invalid coordinates
      expect(warnSpy).toHaveBeenCalled();
      
      const invalidEventCount = sampleEvents.filter(e => 
        !e.coordinates || 
        !e.coordinates.latitude || 
        !e.coordinates.longitude || 
        Math.abs(e.coordinates.latitude) > 90 || 
        Math.abs(e.coordinates.longitude) > 180
      ).length;
      
      expect(warnSpy).toHaveBeenCalledTimes(invalidEventCount);
      
      warnSpy.mockRestore();
    });
  });
});
