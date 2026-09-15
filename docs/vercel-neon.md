# Publicar FORJA en Vercel + Neon

Esta es la arquitectura recomendada para producción. Vercel sirve la PWA y la API bajo el mismo origen; Neon conserva cuentas, sesiones, passkeys y estados; QStash programa los temporizadores de descanso sin depender de un proceso Node permanente. Un cron diario de Vercel recupera temporizadores pendientes y envía los recordatorios mensuales de perímetros.

Docker y los archivos JSON continúan disponibles para desarrollo local. En Vercel, `DATABASE_URL` es obligatorio y no se escribe en `./data`.

## 1. Preparar los servicios

1. Importa el repositorio en Vercel con la raíz del proyecto como **Root Directory**. `vercel.json` selecciona Vite, construye `frontend/dist` y enruta `/api/*` a la función Node.
2. Añade la integración de Neon al proyecto y crea una base o rama exclusiva para FORJA. Comprueba que Vercel haya creado `DATABASE_URL` para Production.
3. Crea una cuenta QStash en Upstash y copia `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` y `QSTASH_NEXT_SIGNING_KEY`.
4. Elige el dominio definitivo. Puede ser un dominio propio o el dominio estable de producción de Vercel. No registres passkeys hasta decidirlo.

Las ramas Preview pueden usar contraseña para QA. No añadas sus URLs variables a la configuración de WebAuthn de producción.

## 2. Variables de producción

Configura estas variables en **Project Settings → Environment Variables → Production**:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Conexión PostgreSQL entregada por Neon |
| `RP_ID` | Hostname definitivo, sin `https://`, puerto ni ruta |
| `RP_NAME` | `FORJA` |
| `EXPECTED_ORIGIN` | URL HTTPS exacta, por ejemplo `https://forja.example.com` |
| `PUBLIC_APP_URL` | La misma URL HTTPS de producción |
| `SESSION_SECRET` | Secreto aleatorio de 48 bytes o más |
| `VAPID_SUBJECT` | Contacto, por ejemplo `mailto:admin@example.com` |
| `VAPID_PUBLIC_KEY` | Clave pública VAPID |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `QSTASH_TOKEN` | Token QStash |
| `QSTASH_CURRENT_SIGNING_KEY` | Clave de firma QStash actual |
| `QSTASH_NEXT_SIGNING_KEY` | Siguiente clave de firma QStash |
| `CRON_SECRET` | Secreto aleatorio de 32 bytes o más |

Generación local de secretos:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
npx web-push generate-vapid-keys
```

Vercel define `VERCEL=1` automáticamente. El backend rechaza el arranque de producción si faltan Neon, QStash, VAPID o el secreto del cron.

## 3. Migrar los datos JSON existentes

La migración crea el esquema automáticamente e importa usuarios, contraseñas derivadas, passkeys y estados. Las sesiones no se copian: todos deben volver a iniciar sesión después del cambio.

Usa una base o rama Neon vacía y conserva una copia cifrada de `data/`. Primero valida:

```sh
DATABASE_URL='postgresql://...' npm run migrate:neon -- --source ./data --dry-run
```

En PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://...'
npm run migrate:neon -- --source ./data --dry-run
```

Si el resumen es correcto, ejecuta el mismo comando sin `--dry-run`:

```sh
npm run migrate:neon -- --source ./data
```

El comando se detiene si la base ya tiene usuarios o estados, si un JSON es inválido o si un estado supera el margen seguro de respuesta de Vercel. No sobrescribe registros existentes.

## 4. Publicar y validar

Ejecuta antes de enviar los cambios:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Después del despliegue de producción:

1. Abre únicamente el dominio configurado en `EXPECTED_ORIGIN`.
2. Crea una cuenta con contraseña, cierra sesión y vuelve a entrar.
3. Registra una passkey, cierra sesión y valida el acceso biométrico en ese mismo dominio.
4. Activa notificaciones, programa un descanso corto y confirma la entrega con la pestaña en segundo plano.
5. Guarda perímetros y confirma la nueva fecha mensual en Métricas.
6. Revisa **Functions** y **Cron Jobs** en Vercel, los mensajes en QStash y las consultas en Neon sin exponer secretos en los logs.

La función diaria `/api/internal/notifications` está protegida con el encabezado `Authorization: Bearer <CRON_SECRET>`, que Vercel añade a sus invocaciones de cron. El callback `/api/internal/qstash` valida la firma criptográfica de QStash y no acepta peticiones comunes.

## 5. Operación

- Activa las copias o restauración temporal disponibles en el plan de Neon y prueba una restauración antes de depender de ella.
- Mantén una rama Neon separada para ensayos de migración y nunca apuntes Preview a la base de producción.
- Si cambia el dominio, las passkeys existentes pueden dejar de ser válidas. Conserva el dominio o comunica el cambio y mantén el acceso por contraseña durante la transición.
- Cambiar `SESSION_SECRET` invalida todas las sesiones; no elimina usuarios ni passkeys.
- Los estados están limitados a 4.000.000 bytes para quedar por debajo del límite de funciones. Las imágenes propias admiten 256 KiB cada una y 2 MiB en conjunto.
- Push depende del permiso del navegador, su conectividad y el proveedor del sistema; el temporizador visible sigue funcionando aunque una notificación no llegue.
