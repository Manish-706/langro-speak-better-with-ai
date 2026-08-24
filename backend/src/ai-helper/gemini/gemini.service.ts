import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AI_SUGGESTION_SYSTEM_INSTRUCTION } from './prompts/suggestion.prompt';
import { GeminiSuggestionResponse } from './gemini.types';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI | null = null;
  // Use current active Google Gemini model
  private readonly modelName = 'gemini-3.5-flash-lite';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('geminiApiKey');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.logger.log(`GeminiService initialized with GoogleGenAI SDK (model: ${this.modelName})`);
    } else {
      this.logger.warn('Gemini API key is not configured.');
    }
  }

  createChatSession() {
    if (!this.ai) return null;
    try {
      return this.ai.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: AI_SUGGESTION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create Gemini chat session', msg);
      return null;
    }
  }

  async addUserUtteranceContext(chat: any, userSpeech: string): Promise<void> {
    if (!chat || !userSpeech?.trim()) return;
    try {
      await chat.sendMessage({
        message: `[User said]: "${userSpeech.trim()}"`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error recording user utterance context: ${msg}`);
    }
  }

  async generateSuggestionsForPartnerTurn(
    chat: any,
    partnerSpeech: string,
  ): Promise<GeminiSuggestionResponse> {
    if (!chat || !partnerSpeech?.trim()) {
      return { suggestions: [] };
    }

    try {
      this.logger.log(`Sending partner utterance to Gemini (${this.modelName}): "${partnerSpeech.trim()}"`);
      const response = await chat.sendMessage({
        message: `[Partner said]: "${partnerSpeech.trim()}". Suggest 1 or 2 natural replies in JSON: {"suggestions": ["..."]}`,
      });

      const responseText = response.text?.trim() || '';
      this.logger.log(`Gemini raw response: ${responseText}`);

      if (!responseText) {
        return { suggestions: [] };
      }

      const parsed = JSON.parse(responseText) as GeminiSuggestionResponse;
      if (Array.isArray(parsed.suggestions)) {
        const filtered = parsed.suggestions
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean)
          .slice(0, 2);
        return { suggestions: filtered };
      }
      return { suggestions: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Error generating suggestions from Gemini', msg);
      return { suggestions: [] };
    }
  }
}
