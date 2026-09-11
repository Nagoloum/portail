import axios from 'axios';

const TOKEN_KEY = 'portail_lawyer_token';

export function getLawyerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setLawyerToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearLawyerToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create();

api.interceptors.request.use((config) => {
  const token = getLawyerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearLawyerToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
