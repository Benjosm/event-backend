import httpx from 'httpx';
import { TWITTER_BEARER_TOKEN } from '../../config/env';

/**
 * Interface for Twitter event data
 */
export interface TwitterEvent {
  id: string;
  text: string;
  timestamp: string;
  location?: string;
}

/**
 * Real Twitter client for fetching breaking events from Twitter API v2
 * Uses bearer token authentication to access the /tweets/search/recent endpoint
 */
export class TwitterClient {
  private readonly baseUrl = 'https://api.twitter.com/2';
  private readonly bearerToken: string;

  constructor() {
    this.bearerToken = TWITTER_BEARER_TOKEN;
  }

  /**
   * Fetches recent tweets about breaking events using Twitter API v2
   * @param queries - Array of search queries for breaking events (optional)
   * @returns Promise resolving to array of TwitterEvent objects
   * @throws Error if API request fails
   */
  async fetchEvents(queries?: string[]): Promise<TwitterEvent[]> {
    // Default queries for breaking events if none provided
    const searchQueries = queries || ['breaking', 'emergency', 'accident', 'crash', 'urgent'];
    
    // Combine queries with OR operator for broader coverage
    const query = searchQueries.join(' OR ');
    
    try {
      const response = await httpx.get(`${this.baseUrl}/tweets/search/recent`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          query: query,
          'tweet.fields': 'created_at,geo,entities',
          'place.fields': 'full_name,country',
          'expansions': 'geo.place_id',
          max_results: 100,
        },
      });

      // Handle HTTP error statuses
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid authentication: Check your Twitter Bearer Token.');
        } else if (response.status === 429) {
          throw new Error('Rate limited: Too many requests to the Twitter API. Please wait and retry.');
        } else if (response.status >= 500) {
          throw new Error(`Twitter API server error: ${response.status}`);
        } else {
          throw new Error(`Twitter API request failed with status ${response.status}`);
        }
      }

      // Parse the response data
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Failed to parse JSON response from Twitter API');
      }

      // Validate required structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response structure from Twitter API: Missing data');
      }

      // Extract and transform tweets to our TwitterEvent format
      const tweets = data.data;
      if (!tweets || !Array.isArray(tweets)) {
        return [];
      }

      const places = data.includes?.places ?? [];

      return tweets.map((tweet: any) => {
        // Normalize location data
        let location: string | undefined;
        if (tweet.geo?.place_id) {
          const place = places.find((p: any) => p.id === tweet.geo.place_id);
          if (place && place.full_name) {
            location = place.full_name;
          }
        }

        // Ensure timestamp is in ISO string format
        const timestamp = new Date(tweet.created_at).toISOString();

        return {
          id: tweet.id,
          text: tweet.text,
          timestamp,
          location,
        };
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw known errors
      }
      throw new Error(`Unexpected error during Twitter API request: ${error}`);
    }
  }
}
