import axios, { AxiosProgressEvent } from 'axios';
import { PublicRequestView } from './types';

function sessionKey(token: string): string {
  return `portail_public_session_${token}`;
}

export function getPublicSession(token: string): string | null {
  return sessionStorage.getItem(sessionKey(token));
}

export function setPublicSession(token: string, accessToken: string): void {
  sessionStorage.setItem(sessionKey(token), accessToken);
}

export function clearPublicSession(token: string): void {
  sessionStorage.removeItem(sessionKey(token));
}

function authHeaders(token: string) {
  const session = getPublicSession(token);
  return session ? { Authorization: `Bearer ${session}` } : {};
}

export async function unlock(token: string, pin: string) {
  const { data } = await axios.post<{ accessToken: string; request: PublicRequestView }>(
    `/public/${token}/unlock`,
    { pin },
  );
  setPublicSession(token, data.accessToken);
  return data.request;
}

export async function getStatus(token: string) {
  const { data } = await axios.get<PublicRequestView>(`/public/${token}/status`, {
    headers: authHeaders(token),
  });
  return data;
}

export async function uploadFile(
  token: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axios.post<PublicRequestView>(`/public/${token}/files`, form, {
    headers: authHeaders(token),
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
}
