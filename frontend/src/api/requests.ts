import { api } from './client';
import { CreateRequestResult, RequestDetail, RequestSummary } from './types';

export interface CreateRequestInput {
  title: string;
  requiredCount?: number;
  expiresInDays?: number;
}

export function createRequest(input: CreateRequestInput) {
  return api.post<CreateRequestResult>('/requests', input).then((r) => r.data);
}

export function listRequests() {
  return api.get<RequestSummary[]>('/requests').then((r) => r.data);
}

export function getRequest(id: string) {
  return api.get<RequestDetail>(`/requests/${id}`).then((r) => r.data);
}
