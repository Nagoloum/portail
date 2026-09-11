import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { PublicPage } from './pages/PublicPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RequireAuth } from './components/RequireAuth';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        // NOTE: deliberately NOT /requests/:id - the SPA is served by the same
        // nginx that proxies the API, and `location /requests` is a prefix
        // match, so a hard refresh on /requests/<id> would hit the API (401
        // JSON) instead of the app. The API keeps the URLs from the brief.
        path="/dossiers/:id"
        element={
          <RequireAuth>
            <RequestDetailPage />
          </RequireAuth>
        }
      />
      <Route path="/d/:token" element={<PublicPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
