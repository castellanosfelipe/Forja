import { BellRing, Fingerprint, KeyRound, LogOut, MonitorSmartphone, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { authApi } from '../../api/auth.api';
import { pushApi } from '../../pwa/push';
import { useAuthStore } from '../../stores/auth.store';
import { useStateStore } from '../../stores/state.store';
import type { PasskeySummary } from '../../types/auth';
import { formatDate } from '../../utils/dates';
import { userFacingError } from '../../utils/user-facing-error';
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
    try { const updated = await authApi.addPasskey(); setUser(updated); setPasskeys(updated.passkeys); setFeedback({ kind: 'success', text: 'Nueva forma de acceso añadida.' }); }
    catch (cause) { setFeedback({ kind: 'error', text: userFacingError(cause, 'No pudimos añadir esta forma de acceso.') }); }
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
      setFeedback({ kind: 'success', text: 'Forma de acceso eliminada. Aún puedes entrar con otra opción.' });
    }
    catch (cause) { setFeedback({ kind: 'error', text: userFacingError(cause, 'No pudimos eliminar esta forma de acceso.') }); }
    finally { setBusy(false); }
  }

  async function enablePush() {
    setBusy(true); setFeedback(null);
    try {
      await flush();
      if (useStateStore.getState().hasPendingChanges) throw new Error('Primero espera a que se guarden tus cambios o guarda una copia. Después podrás activar los avisos.');
      await pushApi.enable();
      await useStateStore.getState().refresh();
      setFeedback({ kind: 'success', text: 'Avisos de descanso activados en este dispositivo.' });
    }
    catch (cause) { setFeedback({ kind: 'error', text: userFacingError(cause, 'No pudimos activar los avisos en este dispositivo.') }); }
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
    } catch (cause) { setFeedback({ kind: 'error', text: userFacingError(cause, 'No pudimos cambiar este recordatorio.') }); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      await reset().catch(() => undefined);
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
      <header className="page-header"><div><p className="eyebrow">Tu cuenta</p><h1>Tu espacio</h1><p>Gestiona cómo entras, recibes avisos y entrenas.</p></div><button className="secondary-button" type="button" disabled={busy} onClick={requestSignOut}><LogOut size={18} /> Cerrar sesión</button></header>
      {feedback && <div className={feedback.kind === 'error' ? 'error-banner page-feedback' : 'notice-banner'} role={feedback.kind === 'error' ? 'alert' : 'status'}><span>{feedback.text}</span><button className="icon-button" type="button" aria-label="Cerrar aviso" onClick={() => setFeedback(null)}>×</button></div>}

      <section className="profile-grid">
        <article className="content-card identity-card"><div className="profile-avatar">{user.displayName.slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">Cuenta</p><h2>{user.displayName}</h2><span>@{user.username} · desde {formatDate(user.createdAt)}</span></div><ShieldCheck size={26} /></article>

        <article className="content-card settings-card span-2"><div className="card-heading"><div><p className="eyebrow">Acceso rápido</p><h2>Formas de entrar</h2><p className="muted">FORJA no recibe ni guarda tu huella o rostro. {user.passwordEnabled ? 'También puedes entrar con tu contraseña y cambiar estas opciones cuando quieras.' : 'Mantén al menos una opción activa para poder entrar.'}</p></div><button className="primary-button" type="button" disabled={busy} onClick={() => void addPasskey()}><Plus size={17} /> {busy ? 'Esperando…' : 'Añadir forma de acceso'}</button></div><div className="passkey-list">{passkeys.length === 0 && <p className="passkey-empty"><KeyRound size={20} /> Tu cuenta usa contraseña. Puedes añadir el acceso con huella, rostro o llave cuando quieras.</p>}{passkeys.map((passkey, index) => { const cannotRemove = passkeys.length <= 1 && !user.passwordEnabled; return <div key={passkey.id}><span className="passkey-icon">{passkey.transports.includes('internal') ? <Fingerprint /> : <KeyRound />}</span><div><strong>{passkey.transports.includes('internal') ? 'Huella o rostro' : 'Llave física'} {index + 1}</strong><small>{passkey.backedUp ? 'Disponible en tus dispositivos' : 'Solo en este dispositivo'} · {passkey.lastUsedAt ? `usada ${formatDate(passkey.lastUsedAt)}` : `creada ${formatDate(passkey.createdAt)}`}</small></div><button className="icon-button danger" type="button" disabled={busy || cannotRemove} title={cannotRemove ? 'Añade otra forma de acceso antes de eliminar esta' : undefined} onClick={() => setPasskeyToRemove(passkey)} aria-label={`Eliminar forma de acceso ${index + 1}`}><Trash2 size={17} /></button></div>; })}</div></article>

        <article className="content-card settings-card"><h2>Este dispositivo</h2><div className="setting-action"><span><BellRing size={20} /></span><div><strong>Avisos y recordatorios</strong><small>Recibe avisos de descansos y mediciones aunque no estés mirando FORJA.</small></div><button type="button" className="secondary-button" disabled={busy} onClick={() => void enablePush()}>{state.pushSubscriptions.length ? 'Configurar de nuevo' : 'Activar'}</button></div><div className="setting-action"><span><MonitorSmartphone size={20} /></span><div><strong>Añadir FORJA a tu pantalla</strong><small>Entra más rápido desde un ícono en tu pantalla de inicio.</small></div><button type="button" className="secondary-button" disabled={busy} onClick={() => { if (installEvent) void installEvent.prompt(); else setFeedback({ kind: 'success', text: 'Abre el menú de opciones y elige “Añadir a pantalla de inicio” o “Instalar aplicación”.' }); }}>{installEvent ? 'Añadir' : 'Ver cómo'}</button></div></article>

        <article className="content-card settings-card"><p className="eyebrow">Entrenamiento guiado</p><h2>Preferencias</h2><div className="preference-list"><Toggle label="Recordatorio mensual de perímetros" checked={reminderFor(state).enabled} onChange={(checked) => void setMeasurementReminder(checked)} /><Toggle label="Mantener pantalla encendida" checked={state.preferences.guidedWorkout?.requestWakeLock !== false} onChange={(checked) => void update((draft) => { draft.preferences.guidedWorkout = { ...draft.preferences.guidedWorkout, requestWakeLock: checked }; })} /><Toggle label="Registrar" abbreviation="RPE" checked={state.preferences.guidedWorkout?.showRpe !== false} onChange={(checked) => void update((draft) => { draft.preferences.guidedWorkout = { ...draft.preferences.guidedWorkout, showRpe: checked }; })} /><Toggle label="Registrar" abbreviation="RIR" checked={state.preferences.guidedWorkout?.showRir !== false} onChange={(checked) => void update((draft) => { draft.preferences.guidedWorkout = { ...draft.preferences.guidedWorkout, showRir: checked }; })} /><Toggle label="Avisarme cuando termine el descanso" checked={state.preferences.restTimer?.webPushWhenHidden !== false} onChange={(checked) => void update((draft) => { draft.preferences.restTimer = { ...draft.preferences.restTimer, webPushWhenHidden: checked }; })} /></div></article>
      </section>
      <ConfirmDialog
        open={Boolean(passkeyToRemove)}
        title="¿Eliminar esta forma de acceso?"
        description="Ya no podrás entrar con esta opción. Las demás seguirán disponibles."
        confirmLabel="Eliminar acceso"
        busy={busy}
        onCancel={() => setPasskeyToRemove(null)}
        onConfirm={() => passkeyToRemove ? removePasskey(passkeyToRemove.id) : undefined}
      />
      <ConfirmDialog
        open={confirmSignOut}
        title="¿Cerrar sesión sin guardar todos los cambios?"
        description={syncStatus === 'conflict'
          ? 'Hay cambios distintos en este y otro dispositivo. Si cierras sesión ahora, perderás los de este dispositivo. Cancela para conservarlos.'
          : 'Hay cambios que aún no se han guardado en tu cuenta. Si cierras sesión ahora, los perderás.'}
        confirmLabel="Cerrar sin guardar"
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
