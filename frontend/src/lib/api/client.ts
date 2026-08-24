import axios, { AxiosError } from 'axios';
import type { ApiError } from '@/types/auth.types';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true, // Required — sends HTTP-only cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Response interceptor ────────────────────────────────────────────────────
// Normalizes Axios errors into a consistent ApiError shape for the rest of
// the application. Raw Axios/HTTP internals do not leak into UI code.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const apiError: ApiError = {
      statusCode: error.response?.status ?? 0,
      message: error.response?.data?.message ?? error.message ?? 'An unexpected error occurred',
      error: error.response?.data?.error ?? 'Error',
    };
    return Promise.reject(apiError);
  },
);

export default apiClient;
