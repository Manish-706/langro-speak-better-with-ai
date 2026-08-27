import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepgramTokenDto } from './deepgram.types';

@Injectable()
export class DeepgramService {
  private readonly logger = new Logger(DeepgramService.name);
  private readonly apiKey: string | undefined;
  private cachedProjectId: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('deepgramApiKey')?.trim();
    if (!this.apiKey) {
      this.logger.warn('DEEPGRAM_API_KEY is not configured.');
    }
  }

  private async getProjectId(): Promise<string | null> {
    if (this.cachedProjectId) return this.cachedProjectId;
    if (!this.apiKey) return null;

    try {
      const res = await fetch('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${this.apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const projectId = data.projects?.[0]?.project_id;
        if (projectId) {
          this.cachedProjectId = projectId;
          this.logger.log(`Resolved Deepgram Project ID: ${projectId}`);
          return projectId;
        }
      } else {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Failed to fetch Deepgram projects (${res.status}): ${text}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error fetching Deepgram projectId: ${msg}`);
    }
    return null;
  }

  async createTemporaryToken(): Promise<DeepgramTokenDto> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Deepgram is not configured');
    }

    const ttlSeconds = 60;

    try {
      const projectId = await this.getProjectId();
      if (projectId) {
        // Mint ephemeral, scoped temporary API key
        const keyRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
          method: 'POST',
          headers: {
            Authorization: `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment: 'Ephemeral browser STT token',
            scopes: ['usage:write'],
            time_to_live_in_seconds: ttlSeconds,
          }),
        });

        if (keyRes.ok) {
          const keyData = await keyRes.json();
          if (keyData.key) {
            return {
              token: keyData.key,
              expiresInSeconds: ttlSeconds,
            };
          }
        } else {
          const text = await keyRes.text().catch(() => '');
          this.logger.warn(`Deepgram temporary key creation failed (${keyRes.status}): ${text}. Falling back to root key.`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Temporary Deepgram key minting error: ${msg}. Falling back to root key.`);
    }

    // Graceful fallback to root key if scoped key creation cannot be performed
    return {
      token: this.apiKey,
      expiresInSeconds: ttlSeconds,
    };
  }
}
