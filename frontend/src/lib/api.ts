import axios from 'axios';
import { translateBackendError } from './errorDictionary';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('travel_lili_access_token');

  if (token && config.headers) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message;

    const translatedMessage = translateBackendError(
      backendMessage,
      error?.response?.status,
    );

    return Promise.reject({
      ...error,
      message: translatedMessage,
      status: error?.response?.status,
    });
  },
);

export default api;
