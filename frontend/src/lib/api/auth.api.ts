import apiClient from './client';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth.types';

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function logoutApi(): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/logout');
  return data;
}

export async function getMeApi(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}
