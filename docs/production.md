# Operación y salida a producción

FORJA mantiene una sola instancia del backend y un directorio JSON privado. No ejecutes varias réplicas contra el mismo directorio: los bloqueos son internos al proceso. Usa almacenamiento local persistente; un volumen de red necesita una validación específica de sus garantías de escritura y renombrado atómico.

## Condiciones antes de publicar

1. Elegir el dominio definitivo, configurar DNS y un certificado HTTPS válido. La PWA y `/api` deben compartir origen. Las passkeys están vinculadas al dominio: no cambiar `RP_ID` después de registrar usuarios sin un plan de migración.
2. Configurar `.env` con `RP_ID` igual al hostname y `EXPECTED_ORIGIN` igual al origen HTTPS exacto, sin ruta, consulta ni fragmento. `localhost` por HTTP es solo para pruebas locales. Mantener `APP_BIND_ADDRESS=127.0.0.1` cuando el terminador TLS esté en el mismo host; nunca publicar directamente el HTTP interno a Internet.
3. El proxy TLS debe preservar `Host`, establecer `X-Forwarded-Proto: https` y enviar **todas** las rutas al puerto local configurado (`APP_PORT`). No separar `/api` en otro dominio. Añadir HSTS en ese proxy después de comprobar el certificado y la renovación automática.
4. Generar un secreto de sesión aleatorio de al menos 32 caracteres y claves VAPID propias. Guardarlos fuera de Git y de los logs. Configurar un contacto real para `VAPID_SUBJECT`. `SESSION_TTL_SECONDS` y `AUTH_FLOW_TTL_SECONDS` se transmiten explícitamente al contenedor.
5. Crear el directorio `FORJA_DATA_DIR` (por defecto `./data`) y otorgar lectura/escritura al UID 1000 del contenedor. En Linux, usar propietario 1000 y permisos restrictivos; no abrirlo a todos los usuarios. Proteger también `.env` y las copias de seguridad. No ejecutar `chmod 777` sobre datos reales.
6. Ejecutar los controles siguientes y comprobar acceso con contraseña, passkey real, cierre de sesión, sincronización de dos dispositivos y recuperación de una copia. Verificar Push y pantalla despierta en los dispositivos que se vayan a soportar. El navegador integrado de QA no sustituye estas pruebas de hardware.

## Comprobaciones reproducibles

Desde la raíz del repositorio, con Node 24 y las dependencias instaladas:

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm run typecheck --prefix backend
npm test --prefix backend
npm run build --prefix backend
npm run typecheck --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
node scripts/qa/verify-precache.mjs
node --test scripts/ops/data-snapshot.test.mjs
npm audit --omit=dev --audit-level=high --prefix backend
npm audit --omit=dev --audit-level=high --prefix frontend
node scripts/qa/compose-smoke.mjs
```

La prueba Compose genera proyecto, claves, puerto y directorio temporales propios; no lee `.env` ni monta los datos reales. Construye las imágenes, verifica Nginx, cabeceras, cuenta con contraseña, estado, reinicio y revocación al salir. Detiene únicamente su propio proyecto. Conserva un `result.json` y los datos ficticios en el directorio temporal indicado al terminar. Requiere Docker operativo. La integración continua ejecuta las suites en Linux y Windows y esta prueba de contenedores en Linux. Configurar estos trabajos como requisitos de la rama es una acción del administrador del repositorio.

Las imágenes usan Node 24 LTS y Nginx 1.30 estable. Reconstruir con `--pull` para incorporar actualizaciones de esas ramas y evaluar periódicamente el cambio de rama. Fuentes: [ciclo de Node](https://nodejs.org/en/about/previous-releases), [versiones de Nginx](https://nginx.org/en/download.html). Para máxima reproducibilidad, el operador puede fijar los digest de las imágenes una vez validadas en su plataforma.

## Actualización segura

Pedir que se sincronice cualquier entrenamiento pendiente; no borrar almacenamiento del navegador. Crear una copia con el backend detenido antes de actualizar. Las cuentas y entrenamientos existentes se conservan. Las sesiones antiguas que no tenían identificador revocable exigirán volver a entrar una vez. No se regeneran las passkeys.

Los cambios de código del Service Worker se aplican cuando se cierran las pestañas de la versión anterior; así una sesión abierta conserva sus recursos. Las imágenes del catálogo se revalidan y mantienen una copia disponible sin conexión. Las imágenes propias se guardan con el estado del usuario (PNG/JPG/WebP, optimizadas a un máximo de 256 KiB cada una y 4 MiB en conjunto). Un archivo de estado inválido se rechaza sin sobrescribirlo: revisar una copia y reparar o restaurar antes de reiniciar.

## Copias y restauración

La exportación del perfil solo contiene el estado de entrenamiento; **no recupera la cuenta ni sus credenciales**. Para recuperar el servicio completo, conservar juntos `db.json`, todos los `state-*.json` y una copia protegida separada de la configuración. Los JSON contienen información privada sin cifrar; cifrar las copias y limitar su acceso/retención es responsabilidad del operador.

La herramienta de instantáneas exige una ventana sin escrituras. `--offline` confirma que el operador ya detuvo el backend; no lo detiene por sí sola. Además detecta cambios durante la copia, valida JSON y verifica tamaños y SHA-256. Estos hashes detectan daños, no autentican una copia de procedencia desconocida.

Ejemplo con rutas relativas explícitas, ejecutado desde la raíz y con la carpeta `backups` ya creada:

```sh
docker compose stop backend
node scripts/ops/data-snapshot.mjs backup ./data ./backups/antes-de-actualizar --offline
node scripts/ops/data-snapshot.mjs verify ./backups/antes-de-actualizar
docker compose start backend
```

Cambiar `./data` por el `FORJA_DATA_DIR` real si difiere. El destino debe ser nuevo; el comando falla si existe. Si una copia falla, no usar el directorio parcial y crear otro destino después de resolver el problema. No reiniciar a ciegas después de un error de copia.

Restaurar siempre en una carpeta nueva:

```sh
node scripts/ops/data-snapshot.mjs restore ./backups/antes-de-actualizar ./data-restaurada
```

Probar esa carpeta en un proyecto aislado antes del cambio definitivo, ajustar su propietario/permisos al servicio y confirmar el número de cuentas y los últimos registros. Para la puesta en servicio, detener el backend, apuntar `FORJA_DATA_DIR` a la carpeta restaurada y recrear el backend. Conservar intacto el directorio anterior para poder volver atrás. Una restauración pierde los cambios posteriores a la instantánea; comunicarlo previamente. Rotar `SESSION_SECRET` al restaurar para invalidar las sesiones que existían en la copia, conservando el dominio y las credenciales de los usuarios.

## Límites que deben comunicarse

- No hay recuperación por correo: una cuenta con contraseña debe conservarla; es recomendable registrar más de una forma de acceso antes de necesitar recuperación.
- Push depende de permisos, conectividad y entrega del proveedor; no garantiza una alarma al segundo exacto. El temporizador visible sigue el reloj real del dispositivo.
- Las guías y métricas son educativas, no una evaluación clínica ni una validación biomecánica individual. Los movimientos propios necesitan una imagen aportada por su usuario.
- El entorno de peso corporal especifica el material requerido; no se anuncia como una rutina completamente libre de equipamiento.

No publicar hasta completar las comprobaciones pendientes documentadas en el informe de remediación. Pasar pruebas de código no certifica por sí solo TLS, entrega Push ni funcionamiento de un autenticador físico.
