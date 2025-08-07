import { NLPService } from './NLPService';
import { EventData } from './types';

interface ClassifiedEvent {
  id: string;
  type: string;
  confidence: number;
  location: {
    latitude: number;
    longitude: number;
  };
  description: string;
  keywords: string[];
  entities: Array<{text: string, type: string}>;
}

export class EventClassificationService {
  private nlpService: NLPService;

  constructor() {
    this.nlpService = new NLPService();
  }

  async classifyEvent(tweetText: string, location: {latitude: number, longitude: number}): Promise<ClassifiedEvent> {
    // Analyze the tweet text using NLP
    const nlpResult = await this.nlpService.analyzeText(tweetText);
    
    // Extract keywords (nouns and proper nouns)
    const keywords = nlpResult.tokens.filter(token => {
      const posTags = nlpResult.pos[token];
      return posTags?.includes('NOUN') || posTags?.includes('PROPN');
    });

    // Determine event type based on keywords and entities
    const eventType = this.determineEventType(keywords, nlpResult.entities);
    
    return {
      id: this.generateEventId(tweetText, location),
      type: eventType.type,
      confidence: eventType.confidence,
      location,
      description: tweetText,
      keywords,
      entities: nlpResult.entities
    };
  }

  private determineEventType(keywords: string[], entities: Array<{text: string, type: string}>): { type: string, confidence: number } {
    const keywordStr = keywords.join(' ').toLowerCase();
    const entityTypes = entities.map(e => e.type);
    
    // Check for disaster-related keywords
    if (this.containsKeywords(keywordStr, ['earthquake', 'quake', 'seismic', 'tremor']) ||
        this.hasEntityType(entityTypes, ['GPE', 'LOC']) && this.containsKeywords(keywordStr, ['disaster', 'emergency', 'crisis'])) {
      return { type: 'natural_disaster', confidence: 0.9 };
    }
    
    // Check for protest-related keywords
    if (this.containsKeywords(keywordStr, ['protest', 'demonstration', 'rally', 'march']) ||
        this.hasEntityType(entityTypes, ['ORG', 'PERSON']) && this.containsKeywords(keywordStr, ['against', 'ban', 'restriction', 'rights'])) {
      return { type: 'protest', confidence: 0.85 };
    }
    
    // Check for concert-related keywords
    if (this.containsKeywords(keywordStr, ['concert', 'show', 'performance', 'live']) ||
        this.hasEntityType(entityTypes, ['PERSON', 'ORG']) && this.containsKeywords(keywordStr, ['playing', 'performing', 'tour'])) {
      return { type: 'concert', confidence: 0.8 };
    }
    
    // Check for sports-related keywords
    if (this.containsKeywords(keywordStr, ['game', 'match', 'win', 'lose', 'score']) ||
        this.hasEntityType(entityTypes, ['ORG', 'PERSON']) && this.containsKeywords(keywordStr, ['team', 'player', 'coach'])) {
      return { type: 'sports', confidence: 0.75 };
    }
    
    // Default to general event
    return { type: 'general', confidence: 0.5 };
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private hasEntityType(entityTypes: string[], targetTypes: string[]): boolean {
    return entityTypes.some(type => targetTypes.includes(type));
  }

  private generateEventId(text: string, location: {latitude: number, longitude: number}): string {
    // Simple hash function to generate consistent IDs for similar events
    const combined = text.toLowerCase().replace(/[^a-z0-9]/g, '') + 
                    location.latitude.toFixed(2) + 
                    location.longitude.toFixed(2);
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `event_${Math.abs(hash).toString(36)}`;
  }
}
