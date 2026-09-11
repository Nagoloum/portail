export interface LawyerJwtPayload {
  sub: string; // lawyer id
  email: string;
  type: 'lawyer';
}

export interface PublicJwtPayload {
  sub: string; // deposit request id
  token: string; // the public link token, double-checked against the URL param
  type: 'public';
}
