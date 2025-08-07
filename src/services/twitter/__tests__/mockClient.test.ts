import { MockTwitterClient } from '../mockClient';

describe('Twitter Mock Client', () => {
  describe('fetchEvents', () => {
    it('returns expected event data on successful request', async () => {
      const client = new MockTwitterClient();
      const response = await client.fetchEvents(false);
      
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(2);
      expect(response[0]).toEqual({
        id: 'test1',
        text: 'Test event 1'
      });
      expect(response[1]).toEqual({
        id: 'test2',
        text: 'Test event 2'
      });
    });

    it('throws error when fail=true parameter is provided', async () => {
      const client = new MockTwitterClient();
      await expect(client.fetchEvents(true)).rejects.toThrow(
        'Simulated Twitter API failure'
      );
    });

    it('properly processes and formats response data', async () => {
      const client = new MockTwitterClient();
      const response = await client.fetchEvents(false);
      
      response.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('text');
      });
    });
  });
});
