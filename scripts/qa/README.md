# Herramientas de QA de FORJA

Ejecutar desde la raíz con Node 24 y las dependencias instaladas. Todos los datos son ficticios; nunca apuntar estos scripts al directorio real.

```powershell
& './backend/node_modules/.bin/tsx.cmd' scripts/qa/backend-audit.mts
node frontend/node_modules/vitest/vitest.mjs run --config scripts/qa/business/vitest.config.ts
npm run build --prefix frontend
node scripts/qa/verify-precache.mjs
node frontend/node_modules/vitest/vitest.mjs run --config scripts/qa/pwa/vitest.config.mjs
```

Backend y negocio escriben por defecto en `work/remediation/backend` y `work/remediation/business`. Para otra campaña, configurar `QA_OUTPUT_DIR`. Ambos fallan ante casos FAIL; revisar igualmente los BLOCKED y NOT TESTED. Usan claves ficticias, HTTP loopback y almacenamiento/reloj/transporte controlados. No envían Push real.

No usar `docs/qa/2026-09-09` como salida: contiene evidencia histórica. `consolidate.mjs` y `verify-report.mjs` corresponden exclusivamente a ese informe; no ejecutar el consolidador para campañas nuevas. La remediación posterior está en `docs/qa/2026-09-14`.

## Interfaz y contenedores

Tras compilar ambos proyectos, `node scripts/qa/ui-server.mjs` sirve el frontend y API en `http://localhost:5180` y usa sólo `work/remediation/ui-data`. El puerto admite `QA_PORT`. Usar cuentas ficticias; detener con Ctrl+C. No publicar este servidor ni confundirlo con Nginx/TLS.

`node scripts/qa/compose-smoke.mjs` construye y prueba el Compose real con proyecto, puerto, claves y datos temporales propios. No carga `.env` ni monta datos reales. Requiere Docker operativo, detiene sólo sus contenedores y conserva `result.json` y los datos ficticios en el directorio temporal indicado.

El verificador de precaché lee los archivos reales de `frontend/dist` en una VM. No controla un navegador ni sustituye la instalación en un teléfono. Las observaciones visuales se registran por separado. Consultar también `docs/production.md`.
