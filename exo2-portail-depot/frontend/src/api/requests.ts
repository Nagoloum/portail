import { api } from './client';
import { CreateRequestResult, Paginated, RequestDetail, RequestSummary } from './types';

export interface CreateRequestInput {
  title: string;
  requiredCount?: number;
  expiresInDays?: number;
}

/** Matches the backend's DEFAULT_PAGE_SIZE; two cards per row, ten rows. */
export const REQUESTS_PAGE_SIZE = 20;

export function createRequest(input: CreateRequestInput) {
  return api.post<CreateRequestResult>('/requests', input).then((r) => r.data);
}

export function listRequests(page = 1, limit = REQUESTS_PAGE_SIZE) {
  return api
    .get<Paginated<RequestSummary>>('/requests', { params: { page, limit } })
    .then((r) => r.data);
}

export function getRequest(id: string) {
  return api.get<RequestDetail>(`/requests/${id}`).then((r) => r.data);
}
