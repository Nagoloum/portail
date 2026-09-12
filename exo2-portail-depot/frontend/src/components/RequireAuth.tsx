import { Navigate } from 'react-router-dom';
import { getLawyerToken } from '../api/client';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getLawyerToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
