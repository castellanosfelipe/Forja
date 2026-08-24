import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthScreen } from './features/auth/AuthScreen';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LibraryPage } from './features/exercises/LibraryPage';
import { WorkoutPage } from './features/guided-workout/WorkoutPage';
import { MetricsPage } from './features/metrics/MetricsPage';
import { NotFoundPage } from './features/NotFoundPage';
import { PlanPage } from './features/planning/PlanPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { useAuthStore } from './stores/auth.store';

export default function App() {
  const user = useAuthStore((store) => store.user);
  const status = useAuthStore((store) => store.status);
  const initialize = useAuthStore((store) => store.initialize);
  const setUser = useAuthStore((store) => store.setUser);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (status === 'loading') {
    return <div className="app-loading" role="status" aria-live="polite"><div className="brand-mark" aria-hidden="true"><span>F</span></div><p>Preparando FORJA…</p></div>;
  }
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="workout" element={<WorkoutPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
