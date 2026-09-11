export type RequestStatus = 'PENDING' | 'COMPLETE' | 'EXPIRED';

export interface RequestSummary {
  id: string;
  title: string;
  status: RequestStatus;
  requiredCount: number;
  uploadedCount: number;
  createdAt: string;
  expiresAt: string;
  link: string;
}

export interface DepositFileSummary {
  id: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

export interface RequestDetail extends RequestSummary {
  files: DepositFileSummary[];
}

export interface CreateRequestResult {
  id: string;
  title: string;
  token: string;
  pin: string;
  link: string;
  expiresAt: string;
  requiredCount: number;
  status: RequestStatus;
}

export interface PublicRequestView {
  title: string;
  status: RequestStatus;
  requiredCount: number;
  uploadedCount: number;
  expiresAt: string;
  files: DepositFileSummary[];
}
