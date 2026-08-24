import { BellRing, Fingerprint, KeyRound, LogOut, MonitorSmartphone, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { authApi } from '../../api/auth.api';
import { ApiError } from '../../api/client';
import { pushApi } from '../../pwa/push';
import { useAuthStore } from '../../stores/auth.store';
import { useStateStore } from '../../stores/state.store';
import type { PasskeySummary } from '../../types/auth';
import { formatDate } from '../../utils/dates';
import { reminderFor } from '../metrics/measurement-reminder';
import { Abbreviation } from '../../components/feedback/Abbreviation';

export function ProfilePage() {
  const user = useAuthStore((store) => store.user)!;
  const setUser = useAuthStore((store) => store.setUser);
  const logout = useAuthStore((store) => store.logout);
  const state = useStateStore((store) => store.state);
  const syncStatus = useStateStore((store) => store.status);
  const hasPendingChanges = useStateStore((store) => store.hasPendingChanges);
  const update = useStateStore((store) => store.update);
  const flush = useStateStore((store) => store.flush);
  const reset = useStateStore((store) => store.reset);
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>(user.passkeys);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [passkeyToRemove, setPasskeyToRemove] = useState<PasskeySummary | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [installEvent, setInstallEvent] = useState<Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    const listener = (event: Event) => { event.preventDefault(); setInstallEvent(event as typeof installEvent); };
    window.addEventListener('beforeinstallprompt', listener);
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);

  if (!state) return null;

  async function addPasskey() {
    setBusy(true); setFeedback(null);
    try { const updated = await authApi.addPasskey(); setUser(updated); setPasskeys(updated.passkeys); setFeedback({ kind: 'success', text: 'Nueva Passkey añadida.' }); }
    catch (cause) { setFeedback({ kind: 'error', text: message(cause) }); }
    finally { setBusy(false); }
  }

  async function removePasskey(id: string) {
    setBusy(true); setFeedback(null);
    try {
      await authApi.removePasskey(id);
      const nextPasskeys = passkeys.filter((item) => item.id !== id);
      setPasskeys(nextPasskeys);
      setUser({ ...user, passkeys: nextPasskeys });
      setPasskeyToRemove(null);
      setFeedback({ kind: 'success', text: 'Passkey eliminada. Tu método de acceso alternativo sigue activo.' });
    }
    catch (cause) { setFeedback({ kind: 'error', text: message(cause) }); }
    finally { setBusy(false); }
  }

  async function enablePush() {
    setBusy(true); setFeedback(null);
    try {
      await flush();
      if (useStateStore.getState().hasPendingChanges) throw new Error('Sincroniza o exporta primero los cambios locales antes de activar avisos en este dispositivo.');
      await pushApi.enable();
      await useStateStore.getState().refresh();
      setFeedback({ kind: 'success', text: 'Avisos de descanso activados en este dispositivo.' });
    }
    catch (cause) { setFeedback({ kind: 'error', text: message(cause) }); }
    finally { setBusy(false); }
  }

  async function setMeasurementReminder(enabled: boolean) {
    setBusy(true); setFeedback(null);
    try {
      await update((draft) => {
        draft.bodyMeasurementReminder = { ...reminderFor(draft), enabled };
      });
      if (navigator.onLine) await pushApi.syncMeasurementReminder();
      setFeedback({ kind: 'success', text: enabled ? 'Recordatorio mensual de perímetros activado.' : 'Recordatorio mensual de perímetros desactivado.' });
    } catch (cause) { setFeedback({ kind: 'error', text: message(cause) }); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      reset();
      await logout();
    } finally {
      setBusy(false);
      setConfirmSignOut(false);
    }
  }

  function requestSignOut() {
    if (hasPendingChanges || syncStatus === 'conflict') {
      setConfirmSignOut(true);
      return;
    }
    void signOut();
  }

  return (
    <main className="page profile-page">
      <header className="page-header"><div><p className="eyebrow">Control local</p><h1>Tu espacio</h1><p>Identidad, dispositivo y preferencias de entrenamiento.</p></div><button className="secondary-button" type="button" disabled={busy} onClick={requestSignOut}><LogOut size={18} /> Cerrar sesión</button></header>
      {feedback && <div className={feedback.kind === 'error' ? 'error-banner page-feedback' : 'notice-banner'} role={feedback.kind === 'error' ? 'alert' : 'status'}><span>{feedback.text}</span><button className="icon-button" type="button" aria-label="Cerrar aviso" onClick={() => setFeedback(null)}>×</button></div>}

      <section className="profile-grid">
        <article className="content-card identity-card"><div className="profile-avatar">{user.displayName.slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">Cuenta</p><h2>{user.displayName}</h2><span>@{user.username} · desde {formatDate(user.createdAt)}</span></div><ShieldCheck size={26} /></article>

        <article className="content-card settings-card span-2"><div className="card-heading"><div><p className="eyebrow">Acceso sin contraseña</p><h2>Passkeys</h2><p className="muted">Tu biometría nunca sale del dispositivo. {user.passwordEnabled ? 'La contraseña permite retirar incluso la última Passkey.' : 'Conserva al menos una Passkey activa para no perder el acceso.'}</p></div><button className="primary-button" type="button" disabled={busy} onClick={() => void addPasskey()}><Plus size={17} /> {busy ? 'Esperando…' : 'Añadir Passkey'}</button></div><div className="passkey-list">{passkeys.length === 0 && <p className="passkey-empty"><KeyRound size={20} /> Tu cuenta usa contraseña. Puedes añadir una Passkey cuando quieras.</p>}{passkeys.map((passkey, index) => { const cannotRemove = passkeys.length <= 1 && !user.passwordEnabled; return <div key={passkey.id}><span className="passkey-icon">{passkey.transports.includes('internal') ? <Fingerprint /> : <KeyRound />}</span><div><strong>{passkey.transports.includes('internal') ? 'Biometría del dispositivo' : 'Llave de seguridad'} {index + 1}</strong><small>{passkey.backedUp ? 'Sincronizada' : 'Este dispositivo'} · {passkey.lastUsedAt ? `usada ${formatDate(passkey.lastUsedAt)}` : `creada ${formatDate(passkey.createdAt)}`}</small></div><button className="icon-button danger" type="button" disabled={busy || cannotRemove} title={cannotRemove ? 'Añade otra Passkey antes de eliminar esta' : undefined} onClick={() => setPasskeyToRemove(passkey)} aria-label={`Eliminar Passkey ${index + 1}`}><Trash2 size={17} /></button></div>; })}</div></article>

        <article className="content-card settings-card"><p className="eyebrow"><Abbreviation code="PWA" /></p><h2>Este dispositivo</h2><div className="setting-action"><span><BellRing size={20} /></span><div><strong>Avisos y recordatorios</strong><small>Web Push avisa sobre descansos y mediciones incluso con FORJA cerrado.</small></div><button type="button" className="secondary-button" disabled={busy} onClick={() => void enablePush()}>{state.pushSubscriptions.length ? 'Renovar' : 'Activar'}</button></div><div className="setting-action"><span><MonitorSmartphone size={20} /></span><div><strong>Instalar FORJA</strong><small>Ábrelo como una app, sin tienda ni binarios nativos.</small></div><button type="button" className="secondary-button" disabled={busy} onClick={() => { if (installEvent) void installEvent.prompt(); else setFeedback({ kind: 'success', text: 'Abre el menú del navegador y elige “Añadir a pantalla de inicio” o “Instalar aplicación”.' }); }}>{installEvent ? 'Instalar' : 'Ver cómo'}</button></div></article>

        <article className="content-card settings-card"><p className="eyebrow">Entrenamiento guiado</p><h2>Preferencias</h2><div className="preference-list"><Toggle label="Recordatorio mensual de perímetros" checked={reminderFor(state).enabled} onChange={(checked) => void setMeasurementReminder(checked)} /><Toggle label="Mantener pantalla encendida" checked={state.preferences.guidedWorkout?.requestWakeLock !== false} onChange={(checked) => void update((draft) => { draft.preferences.guidedWorkout = { ...draft.preferences.guidedWorkout, requestWakeLock: checked }; })} /><Toggle label="Registrar" abbreviation="RPE" checked={state.preferences.guidedWorkout?.showRpe !== false} onChange={(checked) => void update((draft) => { draft.preferences.guidedWorkout = { ...draft.preferences.guidedWorkout, showRpe: checked }; })} /><Toggle label="Registrar" abbreviation="RIR" checked={state.preferences.guidedWorkout?.showRir !== false} onChange={(checked) => void update((draft) => { draft.preferences.guidedWorkout = { ...draft.preferences.guidedWorkout, showRir: checked }; })} /><Toggle label="Aviso Push al terminar descanso" checked={state.preferences.restTimer?.webPushWhenHidden !== false} onChange={(checked) => void update((draft) => { draft.preferences.restTimer = { ...draft.preferences.restTimer, webPushWhenHidden: checked }; })} /></div></article>
      </section>
      <ConfirmDialog
        open={Boolean(passkeyToRemove)}
        title="¿Eliminar esta Passkey?"
        description="Ese dispositivo dejará de servir para iniciar sesión con esta credencial. Las demás Passkeys seguirán activas."
        confirmLabel="Eliminar Passkey"
        busy={busy}
        onCancel={() => setPasskeyToRemove(null)}
        onConfirm={() => passkeyToRemove ? removePasskey(passkeyToRemove.id) : undefined}
      />
      <ConfirmDialog
        open={confirmSignOut}
        title="¿Cerrar sesión y descartar cambios?"
        description={syncStatus === 'conflict'
          ? 'Existe un conflicto de sincronización. Cerrar sesión eliminará los cambios locales que aún no se han conciliado con el servidor. Puedes conservarlos cancelando este aviso.'
          : 'Hay cambios locales pendientes de sincronizar. Cerrar sesión los eliminará de este dispositivo. Puedes conservarlos cancelando este aviso.'}
        confirmLabel="Cerrar y descartar"
        busy={busy}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={signOut}
      />
    </main>
  );
}

function Toggle({ label, abbreviation, checked, onChange }: { label: string; abbreviation?: 'RPE' | 'RIR'; checked: boolean; onChange(value: boolean): void }) {
  const accessibleName = `${label}${abbreviation ? ` ${abbreviation}` : ''}`;
  return <div className="toggle-row"><span>{label}{abbreviation && <> <Abbreviation code={abbreviation} /></>}</span><label className="toggle-control"><input aria-label={accessibleName} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label></div>;
}
function message(cause: unknown): string { return cause instanceof ApiError || cause instanceof Error ? cause.message : 'No se pudo completar la acción.'; }
