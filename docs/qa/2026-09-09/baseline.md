# Baseline reproducido

Commit auditado: `acda8d39f379a8f1c60956b3be14022eeb692770`, rama `main`. Árbol de producto limpio al inicio. Node v24.16.0. Windows/PowerShell, zona America/Bogota. Ejecución inicial: 9 de septiembre de 2026, 06:36 hora local.

| Comprobación | Resultado observado |
|---|---|
| `npm test` en frontend | 28 archivos, 84 tests PASS; 32,94 s |
| `npm run build` en frontend | TypeScript y Vite completados; exit 0 |
| `npm test` en backend | 5 archivos, 18 tests PASS; 11,48 s |
| `npm run build` en backend | TypeScript completado; exit 0 |

Frontend generado: JS 602,60 kB (169,61 kB gzip), CSS 76,42 kB (16,14 kB gzip). Aviso de bundle mayor a 500 kB; no demuestra por sí solo mal rendimiento. Los 102 tests existentes se informan separados de los escenarios adicionales para no inflar su cobertura.

El servidor UI de auditoría sirvió `frontend/dist` y la aplicación backend real en un único origen loopback `localhost:5180`, con almacenamiento exclusivo `work/qa-2026-09-09/ui-data`. No usó `./data` real, VAPID ni proveedores externos. No reproduce headers de Nginx ni TLS; esos escenarios quedan bloqueados. Docker Desktop estaba detenido y no se inició para evitar afectar contenedores ajenos.

Estado ficticio tras los flujos: revisión 27, 196 ejercicios, 1 peso, 1 medición corporal, 3 días base, 1 reprogramación y 1 sesión completada con 14 series. No se incluyeron cookies ni contraseñas de usuario en las evidencias.

La duración larga entre etapas corresponde a interrupciones de la ejecución de auditoría; no es una medición del tiempo que necesita una persona para entrenar ni del rendimiento de la aplicación.

Cierre: cuenta ficticia desconectada, pestaña cerrada, tamaño del navegador restablecido y servidor de prueba detenido con interrupción de su sesión. No queda escucha en el puerto 5180. `git diff` no muestra cambios en archivos previamente versionados. Los documentos y scripts de QA son nuevos; los datos ficticios quedan en `work/` (ignorado). También quedó una caché temporal de Vitest en `node_modules/.vite` de la raíz y su directorio temporal; la limpieza fue rechazada por la herramienta y no se forzó. Esa caché no forma parte del entregable ni debe añadirse a un commit.
