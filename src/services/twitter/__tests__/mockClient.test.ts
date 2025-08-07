import { MockTwitterClient } from '../mockClient';

describe('Twitter Mock Client', () => {
  describe('fetchEvents', () => {
    it('returns an array of events with correct properties', async () => {
      const client = new MockTwitterClient();
      const events = await client.fetchEvents();
      
      // Check that result is an array
      expect(Array.isArray(events)).toBe(true);
      
      // Check that array has length greater than 0
      expect(events.length).toBeGreaterThan(0);
      
      // Check each event has the expected properties with correct types
      events.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(typeof event.id).toBe('string');
        
        expect(event).toHaveProperty('text');
        expect(typeof event.text).toBe('string');
        
        expect(event).toHaveProperty('timestamp');
        expect(typeof event.timestamp).toBe('number');
        
        expect(event).toHaveProperty('location');
        expect(typeof event.location).toBe('string');
      });
    });
  });
});
