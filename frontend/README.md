# FORJA Frontend

PWA React/Vite para entrenamiento guiado, peso corporal, planificación semanal y acceso con contraseña o Passkeys.

## Desarrollo

```bash
npm install
npm run dev
```

Vite publica `http://localhost:5173` y reenvía `/api` al backend local en `http://127.0.0.1:3000`. En Docker, el proxy Nginx raíz sirve frontend y API desde un único origen.

## Capacidades web

- WebAuthn mediante `@simplewebauthn/browser`.
- Wake Lock mientras existe una sesión activa.
- Service Worker escrito directamente con las API del navegador.
- Aplicación instalable con manifiesto e iconos normal/maskable.
- Cache del shell; las respuestas privadas `/api` nunca se guardan en Cache Storage.
- Registro visual exacto para los 195 ejercicios base, con imágenes autoalojadas y sin GIF ni coincidencias difusas.
- Caché independiente de demostraciones: cada guía consultada queda disponible sin conexión después de su primera carga.
- Estado offline y cambios pendientes en IndexedDB, aislados por ID de usuario.
- Web Push para avisos de descanso cuando la pestaña está oculta.
- Calculadoras encadenadas de IMC, grasa corporal, TMB/TDEE, macronutrientes, masa magra y FFMI con historial persistente.

## Rutas

- `/`: panel de peso, meta, volumen, mapa anual y músculos trabajados.
- `/plan`: plan base y reprogramaciones por fecha.
- `/library`: biblioteca y creación de ejercicios.
- `/workout`: entrenamiento guiado, cargas previas, RPE/RIR y descansos.
- `/profile`: Passkeys, instalación, Push y preferencias.
- `/metrics`: perfil corporal compartido, calculadoras y evolución de mediciones.

## Verificación

```bash
npm run typecheck
npm test
npm run build
```

El registro versionado está en `src/features/exercises/media/registry.json`. Para reconstruirlo desde las revisiones documentadas de RepDB y Free Exercise DB, coloca ambos repositorios en `work/vendor/` y ejecuta desde la raíz:

```bash
backend/node_modules/.bin/tsx scripts/build-exercise-media.ts
```
