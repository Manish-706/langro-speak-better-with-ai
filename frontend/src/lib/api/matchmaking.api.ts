import apiClient from './client';

export async function joinMatchmakingApi(): Promise<{ joined: boolean }> {
  const { data } = await apiClient.post<{ joined: boolean }>('/matchmaking/join');
  return data;
}

export async function cancelMatchmakingApi(): Promise<{ cancelled: boolean }> {
  const { data } = await apiClient.post<{ cancelled: boolean }>('/matchmaking/cancel');
  return data;
}

export async function getMatchmakingStatusApi(): Promise<{ status: string }> {
  const { data } = await apiClient.get<{ status: string }>('/matchmaking/status');
  return data;
}
