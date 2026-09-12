import { api } from './client';

export interface LoginResponse {
  accessToken: string;
  lawyer: { id: string; email: string; name: string };
}

export function login(email: string, password: string) {
  return api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data);
}
