# FORJA Backend

Servidor HTTP nativo de Node.js para autenticación con contraseña o Passkeys, entrenamientos, progresión y temporizadores mediante Web Push. Usa Neon PostgreSQL cuando existe `DATABASE_URL`; sin ella conserva el almacenamiento JSON local. Las contraseñas se derivan con `scrypt` y una sal aleatoria por cuenta; nunca se persisten en texto plano.

## Requisitos

- Node.js 24 o superior.
- Un origen HTTPS en producción. `http://localhost` se admite únicamente para desarrollo.
- Claves VAPID para habilitar Web Push.

## Desarrollo

Desde `backend/`:

```bash
npm install
npm run dev
```

El backend usa `DATA_DIR` para localizar `db.json` y los archivos `state-<user>.json`. Todas las escrituras se realizan mediante archivo temporal y renombrado atómico.

## Variables

La plantilla raíz `.env.example` contiene todas las variables usadas por Docker Compose. `SESSION_SECRET` debe tener al menos 32 caracteres. Las claves se generan con:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
npx web-push generate-vapid-keys
```

`EXPECTED_ORIGIN` admite varios orígenes exactos separados por coma. `RP_ID` debe ser el hostname, sin esquema ni puerto. La configuración completa de Neon, QStash, cron y VAPID para serverless está en [`../docs/vercel-neon.md`](../docs/vercel-neon.md).

## API

Todas las rutas, salvo salud y ceremonias de autenticación, requieren la cookie de sesión `HttpOnly`.

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio |
| `POST` | `/api/auth/register/options` | Iniciar registro o añadir Passkey |
| `POST` | `/api/auth/register/verify` | Verificar y guardar Passkey |
| `POST` | `/api/auth/password/register` | Crear cuenta con usuario y contraseña |
| `POST` | `/api/auth/password/login` | Iniciar sesión con usuario y contraseña |
| `POST` | `/api/auth/login/options` | Iniciar autenticación discoverable o por usuario |
| `POST` | `/api/auth/login/verify` | Verificar Passkey y crear sesión |
| `GET` | `/api/auth/session` | Consultar sesión |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET/DELETE` | `/api/auth/passkeys[/:credentialId]` | Administrar Passkeys |
| `GET/PUT` | `/api/state` | Leer o reemplazar estado con revisión/ETag |
| `POST/DELETE` | `/api/body-weight[/:entryId]` | Registrar o eliminar peso |
| `POST/PATCH` | `/api/workouts[/:sessionId]` | Crear o actualizar entrenamiento |
| `POST` | `/api/workouts/:sessionId/complete` | Calcular 1RM y progresión |
| `POST` | `/api/workouts/:sessionId/cancel` | Cancelar entrenamiento |
| `GET` | `/api/workouts/previous/:exerciseId` | Recuperar la sesión anterior |
| `GET` | `/api/push/vapid-public-key` | Obtener clave pública VAPID |
| `POST/DELETE` | `/api/push/subscriptions[/:subscriptionId]` | Administrar suscripciones |
| `POST/DELETE` | `/api/push/rest-timers[/:timerId]` | Programar o cancelar avisos de descanso |
| `POST` | `/api/push/body-measurement-reminder/sync` | Sincronizar el recordatorio mensual de perímetros |

Los cambios completos de estado pueden usar `If-Match: "<revision>"`. El servidor responde con `409` si otra pestaña o dispositivo guardó una revisión más reciente.

## Verificación

```bash
npm run typecheck
npm test
npm run build
```
