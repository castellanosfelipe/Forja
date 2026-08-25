import { Fingerprint, KeyRound, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { authApi } from '../../api/auth.api';
import type { AuthUser } from '../../types/auth';
import { userFacingError } from '../../utils/user-facing-error';

interface AuthScreenProps {
  onAuthenticated(user: AuthUser): void;
}

type AuthMode = 'login' | 'register';
type AuthMethod = 'password' | 'passkey';

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [method, setMethod] = useState<AuthMethod>('password');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (mode === 'register' && method === 'password' && password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const user = method === 'password'
        ? mode === 'register'
          ? await authApi.registerWithPassword(username, password)
          : await authApi.loginWithPassword(username, password)
        : mode === 'register'
          ? await authApi.registerPasskey(username, displayName)
          : await authApi.loginPasskey(username || undefined);
      onAuthenticated(user);
    } catch (cause) {
      setError(userFacingError(
        cause,
        method === 'passkey'
          ? 'No pudimos confirmar tu identidad con este dispositivo.'
          : 'No pudimos completar el acceso con contraseña.',
      ));
    } finally {
      setBusy(false);
    }
  }

  function changeMethod(nextMethod: AuthMethod) {
    setMethod(nextMethod);
    setError(null);
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setPassword('');
    setPasswordConfirmation('');
  }

  const isPassword = method === 'password';
  const isRegistration = mode === 'register';

  return (
    <main className="auth-shell">
      <a className="skip-link" href="#auth-form">Saltar al acceso</a>
      <section className="auth-story" aria-label="Presentación">
        <div className="brand-mark" aria-hidden="true"><span>F</span></div>
        <p className="eyebrow">FORJA · Tu progreso, bajo tu control</p>
        <h1 aria-label="Entrena. Registra. Evoluciona.">Entrena.<br />Registra.<br /><em>Evoluciona.</em></h1>
        <p className="auth-lead">Tu progreso es tuyo. Entrena con confianza y mantén el control de tus datos.</p>
        <div className="auth-features">
          <span><ShieldCheck size={18} /> Tus datos, siempre contigo</span>
          <span><LockKeyhole size={18} /> Información protegida</span>
          <span><Fingerprint size={18} /> Elige cómo entrar</span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-inner">
          <p className="step-label">{isRegistration ? 'Primera vez en FORJA' : 'Bienvenido de nuevo'}</p>
          <h2 id="auth-title">{isRegistration ? 'Crea tu cuenta' : 'Abre tu gimnasio'}</h2>
          <p className="muted">Elige cómo quieres proteger y abrir tu cuenta.</p>

          <div className="auth-method-tabs" aria-label="Método de acceso">
            <button type="button" className={isPassword ? 'active' : ''} aria-pressed={isPassword} onClick={() => changeMethod('password')}><KeyRound size={18} /> Usuario y contraseña</button>
            <button type="button" className={!isPassword ? 'active' : ''} aria-pressed={!isPassword} onClick={() => changeMethod('passkey')}><Fingerprint size={18} /> Huella, rostro o llave</button>
          </div>

          <p className="auth-method-description">
            {isPassword
              ? isRegistration ? 'Crea tu cuenta con una contraseña. Más adelante podrás activar el acceso con huella, rostro o llave.' : 'Introduce tu usuario y contraseña.'
              : isRegistration ? 'Confirma tu identidad con la opción segura de tu dispositivo: huella, rostro, código de desbloqueo o llave.' : 'Usa reconocimiento facial, huella dactilar o una llave de seguridad.'}
          </p>

          <form id="auth-form" onSubmit={submit} className="auth-form" aria-busy={busy}>
            {isRegistration && !isPassword && (
              <div className="form-field">
                <label htmlFor="display-name">Nombre visible</label>
                <input id="display-name" autoComplete="name" required minLength={1} maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="¿Cómo te llamamos?" aria-describedby={error ? 'auth-error' : undefined} aria-errormessage={error ? 'auth-error' : undefined} aria-invalid={Boolean(error)} />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="username">Usuario {!isRegistration && !isPassword && <small>(opcional)</small>}</label>
              <input
                id="username"
                autoComplete={!isPassword ? 'username webauthn' : 'username'}
                required={isPassword || isRegistration}
                minLength={isPassword || isRegistration ? 3 : undefined}
                maxLength={64}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={!isRegistration && !isPassword ? 'Vacío para elegir cuenta' : 'atleta'}
                aria-describedby={`username-hint${error ? ' auth-error' : ''}`}
                aria-errormessage={error ? 'auth-error' : undefined}
                aria-invalid={Boolean(error)}
              />
              <small id="username-hint">{!isRegistration && !isPassword ? 'Déjalo vacío para usar una opción guardada en este dispositivo.' : 'De 3 a 64 caracteres: letras, números, punto, guion o guion bajo.'}</small>
            </div>

            {isPassword && (
              <div className="form-field">
                <label htmlFor="password">Contraseña</label>
                <input id="password" type="password" autoComplete={isRegistration ? 'new-password' : 'current-password'} required minLength={isRegistration ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={`${isRegistration ? 'password-hint' : ''}${error ? `${isRegistration ? ' ' : ''}auth-error` : ''}` || undefined} aria-errormessage={error ? 'auth-error' : undefined} aria-invalid={Boolean(error)} />
                {isRegistration && <small id="password-hint">Mínimo 10 caracteres. Usa una frase larga y única para FORJA.</small>}
              </div>
            )}

            {isRegistration && isPassword && (
              <div className="form-field">
                <label htmlFor="password-confirmation">Confirmar contraseña</label>
                <input id="password-confirmation" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} aria-describedby={error ? 'auth-error' : undefined} aria-errormessage={error ? 'auth-error' : undefined} aria-invalid={Boolean(error)} />
              </div>
            )}

            {error && <div className="error-banner" id="auth-error" role="alert">{error} Puedes volver a intentarlo sin perder los datos escritos.</div>}

            <button className="primary-button" disabled={busy} type="submit">
              {isPassword ? <KeyRound size={21} /> : <Fingerprint size={21} />}
              {busy ? 'Verificando…' : isRegistration ? isPassword ? 'Crear cuenta' : 'Crear cuenta y activar acceso rápido' : isPassword ? 'Iniciar sesión' : 'Entrar con huella, rostro o llave'}
            </button>
          </form>

          {!isRegistration ? (
            <section className="auth-alternative" aria-label="Crear una cuenta">
              <div><strong>¿Aún no tienes una cuenta?</strong><small>Regístrate con una contraseña o usa el acceso rápido de tu dispositivo.</small></div>
              <button className="secondary-button" type="button" onClick={() => changeMode('register')}><UserPlus size={18} /> Crear cuenta</button>
            </section>
          ) : (
            <button className="text-button" type="button" onClick={() => changeMode('login')}>¿Ya tienes una cuenta? Iniciar sesión</button>
          )}
        </div>
      </section>
    </main>
  );
}
