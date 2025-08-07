import { TwitterClient, TwitterEvent } from '../client';
import httpx from 'httpx';

// Mock httpx module
jest.mock('httpx', () => ({
  get: jest.fn(),
}));

describe('Real Twitter Client', () => {
  let client: TwitterClient;
  const mockResponseData = {
    data: [
      {
        id: '12345',
        text: 'Breaking news: Major accident on highway',
        created_at: '2023-06-15T10:30:00Z',
        geo: {
          place_id: 'place123'
        }
      },
      {
        id: '67890',
        text: 'Emergency alert issued for downtown area',
        created_at: '2023-06-15T10:25:00Z'
      }
    ],
    includes: {
      places: [
        {
          id: 'place123',
          full_name: 'New York, NY',
          country: 'United States'
        }
      ]
    }
  };

  beforeEach(() => {
    client = new TwitterClient();
    jest.clearAllMocks();
  });

  describe('fetchEvents', () => {
    it('successfully fetches and formats events with location data', async () => {
      // Mock successful response
      (httpx.get as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponseData),
        status: 200,
      });

      const events = await client.fetchEvents();

      expect(httpx.get).toHaveBeenCalledWith(
        'https://api.twitter.com/2/tweets/search/recent',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer '),
          }),
          params: expect.objectContaining({
            query: 'breaking OR emergency OR accident OR crash OR urgent',
            'tweet.fields': 'created_at,geo',
            'place.fields': 'full_name,country',
            max_results: 100,
          }),
        })
      );

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        id: '12345',
        text: 'Breaking news: Major accident on highway',
        timestamp: '2023-06-15T10:30:00Z',
        location: 'New York, NY',
      });
      expect(events[1]).toEqual({
        id: '67890',
        text: 'Emergency alert issued for downtown area',
        timestamp: '2023-06-15T10:25:00Z',
        location: undefined,
      });
    });

    it('returns empty array when no data is returned from API', async () => {
      // Mock response with no data
      (httpx.get as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({}),
        status: 200,
      });

      const events = await client.fetchEvents();

      expect(events).toHaveLength(0);
    });

    it('throws error when API request fails', async () => {
      // Mock failed response
      (httpx.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.fetchEvents()).rejects.toThrow('Twitter API request failed');
    });

    it('uses custom queries when provided', async () => {
      // Mock successful response
      (httpx.get as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponseData),
        status: 200,
      });

      await client.fetchEvents(['fire', 'evacuation']);

      expect(httpx.get).toHaveBeenCalledWith(
        'https://api.twitter.com/2/tweets/search/recent',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'fire OR evacuation',
          }),
        })
      );
    });
  });
});
