# Operación y salida a producción

La producción recomendada usa Vercel + Neon siguiendo [`vercel-neon.md`](vercel-neon.md). Neon permite que varias invocaciones serverless compartan datos y aplica control de concurrencia al estado de cada usuario. El modo Docker con un directorio JSON privado queda para desarrollo o autoalojamiento de una sola instancia; no ejecutes varias réplicas contra el mismo directorio.

## Condiciones antes de publicar

1. Elegir el dominio definitivo, configurar DNS y un certificado HTTPS válido. La PWA y `/api` deben compartir origen. Las passkeys están vinculadas al dominio: no cambiar `RP_ID` después de registrar usuarios sin un plan de transición.
2. En Vercel, configurar `DATABASE_URL`, `RP_ID`, `EXPECTED_ORIGIN`, `PUBLIC_APP_URL`, secretos de sesión, VAPID, QStash y cron como indica la guía. En Docker, configurar `.env`, conservar `APP_BIND_ADDRESS=127.0.0.1` si existe un proxy TLS y no publicar directamente el HTTP interno.
3. Mantener secretos fuera de Git y de los logs. Configurar un contacto real para `VAPID_SUBJECT`. Las bases de Preview deben estar separadas de producción.
4. En Docker, proteger `FORJA_DATA_DIR` y sus copias. En Neon, configurar la política de retención/restauración adecuada al plan y probarla.
5. Ejecutar los controles siguientes y comprobar acceso con contraseña, passkey real, cierre de sesión, sincronización de dos dispositivos y recuperación. Verificar Push y pantalla despierta en dispositivos reales; el navegador integrado de QA no sustituye pruebas de hardware.

## Comprobaciones reproducibles

Desde la raíz del repositorio, con Node 24 y las dependencias instaladas:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run build --workspace=backend
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

Los cambios de código del Service Worker se aplican cuando se cierran las pestañas de la versión anterior; así una sesión abierta conserva sus recursos. Las imágenes del catálogo se revalidan y mantienen una copia disponible sin conexión. Las imágenes propias se guardan con el estado del usuario (PNG/JPG/WebP, optimizadas a un máximo de 256 KiB cada una y 2 MiB en conjunto). El documento completo se limita a 4.000.000 bytes para mantenerse por debajo del límite de respuesta serverless. Un estado inválido se rechaza sin sobrescribirlo: revisar una copia y reparar o restaurar antes de continuar.

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

Publica después de completar las comprobaciones reproducibles y las pruebas del dominio real. Pasar pruebas de código no certifica por sí solo TLS, entrega Push ni funcionamiento de un autenticador físico.
