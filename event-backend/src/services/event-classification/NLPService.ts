import axios from 'axios';
import { EventData } from './types';

interface NLPResult {
  tokens: string[];
  pos: {
    [key: string]: string[];
  };
  entities: {
    text: string;
    type: string;
  }[];
}

export class NLPService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NLP_SERVICE_URL || 'http://localhost:5000';
  }

  async analyzeText(text: string): Promise<NLPResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/analyze`, {
        text
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('NLP service is not available. Please ensure the NLP service is running on port 5000.');
        }
        throw new Error(`NLP service error: ${error.message}`);
      }
      throw new Error(`Unexpected error analyzing text: ${error}`);
    }
  }
}
