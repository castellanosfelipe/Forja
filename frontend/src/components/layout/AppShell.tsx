import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Download,
  Dumbbell,
  LayoutDashboard,
  RefreshCw,
  Settings,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useStateStore } from '../../stores/state.store';
import { userFacingError } from '../../utils/user-facing-error';
import { PageSkeleton } from '../feedback/PageSkeleton';
import { OnboardingWizard } from '../../features/onboarding/OnboardingWizard';
import { ConfirmDialog } from '../feedback/ConfirmDialog';

const navigation = [
  { to: '/', label: 'Resumen', mobileLabel: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/metrics', label: 'Métricas', mobileLabel: 'Métricas', icon: ChartNoAxesCombined, end: false },
  { to: '/plan', label: 'Plan', mobileLabel: 'Plan', icon: CalendarDays, end: false },
  { to: '/library', label: 'Ejercicios', mobileLabel: 'Ejercicios', icon: BookOpen, end: false },
  { to: '/workout', label: 'Entrenar', mobileLabel: 'Entrenar', icon: Dumbbell, end: false },
];

export function AppShell() {
  const location = useLocation();
  const user = useAuthStore((store) => store.user);
  const { state, status, error, hasPendingChanges, load, flush, refresh, clearError } = useStateStore();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [confirmUseServer, setConfirmUseServer] = useState(false);
  const [replacingWithServer, setReplacingWithServer] = useState(false);
  const [replaceFailure, setReplaceFailure] = useState<string | null>(null);
  const previousPath = useRef(location.pathname);
  const displayedError = error
    ? userFacingError(
        new Error(error),
        'No pudimos guardar o recuperar tus datos. Inténtalo de nuevo.',
      )
    : null;

  useEffect(() => {
    void load();
    const sync = () => void flush();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [load, flush]);

  useEffect(() => {
    const title = routeTitle(location.pathname);
    document.title = `${title} · FORJA`;
    if (previousPath.current !== location.pathname) {
      window.requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>('#main-content h1');
        if (heading) {
          heading.tabIndex = -1;
          heading.focus();
        }
      });
    }
    previousPath.current = location.pathname;
  }, [location.pathname]);

  function exportLocalCopy() {
    if (!state) return;
    const backup = {
      savedAt: new Date().toISOString(),
      preferences: state.preferences,
      bodyWeight: state.bodyWeight,
      bodyMetrics: state.bodyMetrics,
      bodyMeasurementReminder: state.bodyMeasurementReminder,
      onboarding: state.onboarding,
      exerciseLibrary: state.exerciseLibrary,
      weeklyPlan: state.weeklyPlan,
      scheduleOverrides: state.scheduleOverrides,
      workoutSessions: state.workoutSessions,
      progression: state.progression,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo-forja-${new Date().toISOString().slice(0, 10)}.forja`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function useServerVersion() {
    setReplacingWithServer(true);
    setReplaceFailure(null);
    try {
      await refresh({ discardPending: true });
      setConfirmUseServer(false);
    } catch {
      setReplaceFailure('No pudimos recuperar los datos guardados en tu cuenta.');
    } finally {
      setReplacingWithServer(false);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark"><span>F</span></div>
          <div><strong>FORJA</strong><small>Entrena. Registra. Evoluciona.</small></div>
        </div>
        <nav aria-label="Navegación principal">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={20} strokeWidth={2.2} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink className={({ isActive }) => `sidebar-footer${isActive ? ' active' : ''}`} to="/profile" aria-label={`Abrir perfil de ${user?.displayName ?? 'usuario'}`}>
          <div className="avatar">{user?.displayName.slice(0, 2).toUpperCase()}</div>
          <div><strong>{user?.displayName}</strong><small>@{user?.username}</small></div>
        </NavLink>
      </aside>

      <div className="app-main" id="main-content" tabIndex={-1}>
        {state?.onboarding?.completedAt && (
          <button
            className="onboarding-launcher"
            type="button"
            title="Editar datos y regenerar rutina"
            aria-label="Reabrir configuración guiada"
            onClick={() => setOnboardingOpen(true)}
          >
            <Settings size={20} aria-hidden="true" />
          </button>
        )}
        {state && (status === 'offline' || status === 'conflict' || error) && (
          <div className={`sync-banner ${status === 'conflict' ? 'conflict' : ''}`} role={status === 'conflict' || status === 'error' ? 'alert' : 'status'}>
            <WifiOff size={17} />
            <span>{displayedError ?? 'Trabajando sin conexión.'}</span>
            {navigator.onLine && hasPendingChanges && status !== 'conflict' && (
              <button type="button" onClick={() => void flush()}><RefreshCw size={15} /> Reintentar</button>
            )}
            {status === 'conflict' && <>
              <button type="button" onClick={() => void flush()}><RefreshCw size={15} /> Volver a intentar</button>
              <button type="button" onClick={() => { setReplaceFailure(null); setConfirmUseServer(true); }}>Descartar cambios de este dispositivo</button>
            </>}
            {hasPendingChanges && <button type="button" onClick={exportLocalCopy}><Download size={15} /> Guardar una copia</button>}
            {error && <button type="button" className="icon-button" onClick={clearError} aria-label="Cerrar aviso">×</button>}
          </div>
        )}
        {status === 'syncing' && <div className="syncing-pill" role="status" aria-live="polite"><RefreshCw size={14} className="spin" aria-hidden="true" /> Guardando cambios</div>}
        {!state && status === 'loading' ? (
          <PageSkeleton />
        ) : !state ? (
          <main className="page state-error-page">
            <div className="empty-state" role="alert">
              <AlertTriangle size={36} aria-hidden="true" />
              <h1>No pudimos cargar tus datos</h1>
              <p>{displayedError ?? 'No pudimos recuperar tus datos. Inténtalo de nuevo.'}</p>
              <button className="primary-button" type="button" onClick={() => void load()}><RefreshCw size={17} /> Intentar de nuevo</button>
            </div>
          </main>
        ) : (
          <Outlet />
        )}
      </div>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {navigation.map(({ to, mobileLabel, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={21} /><span>{mobileLabel}</span>
          </NavLink>
        ))}
        <NavLink className={({ isActive }) => `mobile-account-link${isActive ? ' active' : ''}`} to="/profile" aria-label={`Abrir perfil de ${user?.displayName ?? 'usuario'}`}>
          <span className="mobile-account-avatar" aria-hidden="true">{user?.displayName.slice(0, 2).toUpperCase()}</span>
          <span>Perfil</span>
        </NavLink>
      </nav>
      <OnboardingWizard open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      <ConfirmDialog
        open={confirmUseServer}
        title="¿Descartar los cambios de este dispositivo?"
        description={`Perderás los cambios que todavía no se guardaron en tu cuenta. Si quieres conservarlos, guarda una copia antes de continuar.${replaceFailure ? ` ${replaceFailure}` : ''}`}
        confirmLabel="Descartar cambios y continuar"
        busy={replacingWithServer}
        onCancel={() => { setReplaceFailure(null); setConfirmUseServer(false); }}
        onConfirm={useServerVersion}
      />
    </div>
  );
}

function routeTitle(pathname: string): string {
  if (pathname === '/') return 'Resumen';
  if (pathname.startsWith('/metrics')) return 'Métricas';
  if (pathname.startsWith('/plan')) return 'Plan semanal';
  if (pathname.startsWith('/library')) return 'Biblioteca de ejercicios';
  if (pathname.startsWith('/workout')) return 'Entrenamiento guiado';
  if (pathname.startsWith('/profile')) return 'Perfil';
  return 'Página no encontrada';
}
