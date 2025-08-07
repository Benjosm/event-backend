/**
 * Mock Twitter client for testing purposes.
 * Provides basic functionality to simulate Twitter API responses.
 */
export class MockTwitterClient {
  /**
   * Fetches a list of events.
   * @param {boolean} fail - If true, throws an error to simulate API failure.
   * @returns {Promise<Array<{id: string, text: string}>>} A promise that resolves with an array of events.
   * @throws {Error} If fail is true, throws an error to simulate API failure.
   */
  async fetchEvents(fail = false) {
    if (fail) {
      throw new Error("Simulated Twitter API failure");
    }
    return [
      { id: "test1", text: "Test event 1", timestamp: Date.now(), location: "New York" },
      { id: "test2", text: "Test event 2", timestamp: Date.now() + 1000, location: "London" },
    ];
  }
}
