// src/lib/api/deepgram.api.ts
import apiClient from './client';
import type { DeepgramTokenResponse } from '@/features/ai-helper/speech/deepgram.types';

export async function fetchDeepgramToken(callId: string): Promise<DeepgramTokenResponse> {
    const { data } = await apiClient.get<DeepgramTokenResponse>('/ai-helper/deepgram-token', {
        params: { callId },
    });
    return data;
}