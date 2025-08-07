import { TwitterClient, TwitterEvent } from './client';

// Integration test for the real Twitter API client
describe('TwitterClient Integration Tests', () => {
  let client: TwitterClient;

  beforeAll(() => {
    client = new TwitterClient();
  });

  // Use jest.setTimeout to allow time for the API call
  jest.setTimeout(30000); // 30 seconds

  it('should fetch breaking event tweets from the real Twitter API', async () => {
    // ACT: Call the method to fetch breaking event tweets
    const tweets = await client.fetchEvents();

    // ASSERT: Check that the response is an array
    expect(Array.isArray(tweets)).toBe(true);

    // Additional assertions on each tweet in the array
    tweets.forEach((tweet: TwitterEvent) => {
      // Each tweet should have id, text, and timestamp
      expect(tweet).toHaveProperty('id');
      expect(typeof tweet.id).toBe('string');
      
      expect(tweet).toHaveProperty('text');
      expect(typeof tweet.text).toBe('string');
      
      expect(tweet).toHaveProperty('timestamp');
      expect(typeof tweet.timestamp).toBe('string');
      expect(() => new Date(tweet.timestamp).toISOString()).not.toThrow();

      // Location should be either a string or undefined
      if (tweet.location !== undefined) {
        expect(typeof tweet.location).toBe('string');
      }
    });
  });
});
