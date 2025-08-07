import axios from 'axios';
import { NLPService } from '../NLPService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NLPService', () => {
  let nlpService: NLPService;

  beforeEach(() => {
    nlpService = new NLPService();
    jest.clearAllMocks();
  });

  describe('analyzeText', () => {
    it('should return NLP results for valid text', async () => {
      const mockResponse = {
        data: {
          tokens: ['This', 'is', 'a', 'test'],
          pos: { 'NOUN': ['test'] },
          entities: [{ text: 'test', type: 'NOUN' }]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await nlpService.analyzeText('This is a test');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${process.env.NLP_SERVICE_URL || 'http://localhost:5000'}/analyze`,
        { text: 'This is a test' }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when NLP service is unavailable', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      });

      await expect(nlpService.analyzeText('This is a test'))
        .rejects
        .toThrow('NLP service is not available. Please ensure the NLP service is running on port 5000.');
    });

    it('should throw error for invalid responses', async () => {
      const mockResponse = {
        data: {
          error: 'Invalid text'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await expect(nlpService.analyzeText('This is a test'))
        .rejects
        .toThrow('Invalid text');
    });

    it('should handle unexpected errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Unexpected error'));

      await expect(nlpService.analyzeText('This is a test'))
        .rejects
        .toThrow('Unexpected error analyzing text: Error: Unexpected error');
    });

    it('should handle timeout errors', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'Request timed out'
      });

      await expect(nlpService.analyzeText('This is a test'))
        .rejects
        .toThrow('NLP service error: Request timed out');
    });
  });
});
