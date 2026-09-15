# FORJA — cierre de correcciones backend

Última verificación: **15 de septiembre de 2026**, 08:45–08:46 America/Bogota. Se conserva la carpeta de la campaña iniciada el 14. El informe histórico `docs/qa/2026-09-09` no fue modificado.

## Resultado

Correcciones backend verificadas sin fallos en las pruebas ejecutadas. Esto no certifica todavía la instalación pública, los autenticadores físicos ni la entrega real de notificaciones.

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck` en backend | PASS |
| `npm test` en backend | **92/92 PASS**, 7 archivos |
| `npm run build` en backend | PASS |
| Auditoría HTTP con `QA_OUTPUT_DIR=docs/qa/2026-09-14` | **125 PASS, 0 FAIL** |
| Scheduler `scripts/qa/pwa/scheduler.test.ts` | **6/6 PASS** |
| `git diff --check` | Sin errores de espacios; advertencias normales LF/CRLF de Windows |

La auditoría HTTP añade 3 BLOCKED, 3 NOT TESTED y 1 NOT APPLICABLE, descritos abajo. El JSON completo está en [backend-cases.json](backend-cases.json); los eventos de servidor están en [backend-server.ndjson](backend-server.ndjson). Las pruebas usan usuarios ficticios, servidores loopback y directorios aislados `work/remediation/backend/run-*` o temporales dedicados. No se alteró `./data` real ni se realizaron commit, push o despliegue público.

## Defectos cerrados

| Hallazgo | Corrección y evidencia |
| --- | --- |
| API-D001: cookie reutilizable tras salir | Identificador de sesión persistente y revocación en `db.json`. Reutilizar la cookie termina en 401; otra sesión sigue válida. Prueba de persistencia entre instancias del repositorio. |
| API-D002: replay WebAuthn | Retos persistentes consumidos atómicamente una sola vez, también si la verificación falla. Replay criptográfico con contador cero rechazado; 8 verificaciones simultáneas consumen un único reto. |
| API-D003: estado JSON insuficientemente validado | Validación de objetos anidados, tipos, rangos, referencias y duplicados antes de escribir; transacciones inválidas conservan el estado anterior. Estados guardados corruptos devuelven 503 sin sobreescribirlos. Migración de campos opcionales históricos conservada. |
| API-D004: datos URL/cookie mal codificados provocaban 500 | Cookie inválida tratada como sesión anónima; parámetro de ruta mal codificado devuelve 400. |
| API-D005: fechas imposibles aceptadas | Validación real del calendario y de horas; 30 de febrero rechazado, 29 de febrero de año bisiesto aceptado. |
| API-D006: límite evadido con concurrencia | Reserva síncrona de intentos antes del trabajo asíncrono: en 12 intentos simultáneos, 5 verificaciones y 7 respuestas 429. |
| API-D007: ejercicios/series inválidos | Referencias de biblioteca y números de serie validados en escritura completa y endpoints de entrenamiento; no se completa un registro inconsistente. |
| API-D008: destinos Push internos | HTTPS público obligatorio, claves P-256 válidas, rechazo de IP privadas/especiales y comprobación DNS tanto al admitir como al conectar. Se corrigió además la comparación con `NaN` que admitía IPv6 abreviadas como `::1`. Pruebas de IPv4, IPv6, DNS mixto y rebinding sin solicitudes reales a esos destinos. |
| PWA-F10: posposición mensual offline sin reprogramar | `PUT /api/state` reconcilia el temporizador mensual; se respeta una medición/posposición guardada durante una entrega en curso. Scheduler restaurado, cancelación, expiración de suscripciones y reintento también pasan. |

## Comprobaciones adicionales

- Origen y RP explícitos en producción; sólo orígenes HTTP(S) exactos y compatibles. HTTPS obligatorio salvo loopback local, sin mezclar esquemas; cookies Secure para HTTPS.
- Imágenes personales: PNG, JPEG o WebP en datos embebidos, formato/firma y codificación comprobados, texto alternativo obligatorio de hasta 180 caracteres. Máximo **256 KiB por imagen** y **4 MiB agregados**. SVG y URL remota rechazados. El cuerpo HTTP mantiene el límite global de **10 MiB**, coherente con Nginx.
- `db.json` malformado en ejecución responde 503 controlado; registros de cuentas, credenciales e identificadores duplicados se revisan antes de operar. El archivo permanece sin cambios.
- Escritura atómica con vaciado del contenido antes del reemplazo y permisos de propietario en sistemas que soportan modos POSIX. No se afirma resistencia completa a corte eléctrico: el hardware y la persistencia del directorio no se han probado.
- 25 lecturas concurrentes de un estado pequeño: todas 200, p50 **212,23 ms**, p95 **307,47 ms**. Es una medida local, no una certificación de capacidad de producción.

## Ajustes del instrumental de QA

El caso de entrenamiento positivo usaba `barbell-squat`, inexistente en el catálogo. Se corrigió a `back-squat`, sin debilitar la integridad referencial. La prueba de origen WebAuthn incorrecto ahora solicita una ceremonia nueva para comprobar realmente el origen y no sólo un reto ya consumido. El harness devuelve código de salida no cero ante FAIL o interrupción propia, para evitar falsos éxitos en automatización.

El scheduler usa claves P-256 ficticias válidas y DNS/transportes simulados. Invoca la reconciliación que realiza actualmente la ruta; no depende de Internet ni reduce la validación del producto.

## Límites pendientes de validación de despliegue

1. **BLOCKED:** passkey/biometría real en navegadores y dispositivos de destino. La prueba ECDSA local demuestra el servidor, no la experiencia física del autenticador.
2. **BLOCKED:** entrega Web Push con VAPID y proveedor real. Las pruebas actuales son aisladas.
3. **BLOCKED:** HTTPS y cookies Secure extremo a extremo en el dominio definitivo.
4. **NOT TESTED:** múltiples procesos escribiendo el mismo `DATA_DIR`; usar una sola réplica mientras los mutex sean de proceso.
5. **NOT TESTED:** corte eléctrico y durabilidad completa del almacenamiento.
6. **NOT TESTED:** explotación SSRF mediante conexiones reales; la barrera se comprueba con DNS y transporte simulados.
7. **NOT APPLICABLE:** recuperación/cambio de contraseña o deshabilitación de usuario; no hay endpoints ni requisito de recuperación confirmado en este alcance.

No quedan fallos reproducidos abiertos en los casos backend ejecutados. Las verificaciones de despliegue anteriores deben distinguirse de las correcciones de código ya comprobadas.
