import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthScreen } from './features/auth/AuthScreen';
import { NotFoundPage } from './features/NotFoundPage';
import { useAuthStore } from './stores/auth.store';
import { PageSkeleton } from './components/feedback/PageSkeleton';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const LibraryPage = lazy(() => import('./features/exercises/LibraryPage').then((module) => ({ default: module.LibraryPage })));
const WorkoutPage = lazy(() => import('./features/guided-workout/WorkoutPage').then((module) => ({ default: module.WorkoutPage })));
const MetricsPage = lazy(() => import('./features/metrics/MetricsPage').then((module) => ({ default: module.MetricsPage })));
const PlanPage = lazy(() => import('./features/planning/PlanPage').then((module) => ({ default: module.PlanPage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));

export default function App() {
  const user = useAuthStore((store) => store.user);
  const status = useAuthStore((store) => store.status);
  const initialize = useAuthStore((store) => store.initialize);
  const setUser = useAuthStore((store) => store.setUser);

  useEffect(() => {
    void initialize();
    const reconnect = () => { if (useAuthStore.getState().logoutPending) void initialize(); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [initialize]);

  if (status === 'loading') {
    return <div className="app-loading" role="status" aria-live="polite"><div className="brand-mark" aria-hidden="true"><span>F</span></div><p>Preparando FORJA…</p></div>;
  }
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
