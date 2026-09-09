# FORJA

> Entrena. Registra. Evoluciona.

PWA autoalojada para registrar entrenamiento y peso corporal. React y la API Node se publican bajo un único origen mediante Nginx. Las cuentas pueden usar usuario y contraseña, Passkeys/WebAuthn o ambos métodos; Service Worker y Web Push funcionan bajo el mismo dominio.

Incluye seguimiento de composición corporal con IMC, método de perímetros US Navy, masa magra, FFMI, gasto energético Mifflin–St Jeor y macros por objetivo. Un recordatorio mensual dentro de la PWA y mediante Web Push solicita repetir los perímetros; se reprograma al guardar una medición válida y puede aplazarse siete días. La cadena de calculadoras toma inspiración funcional de [BodyCalc](https://github.com/castellanosfelipe/Body_Calc), publicado bajo licencia MIT, y guarda cada medición en el JSON privado del usuario.

La biblioteca incorpora un catálogo base de **195 ejercicios** en 16 categorías: pecho, espalda, hombros, brazos, agarre, grupos de pierna, core, cuerpo completo, halterofilia, cardio y movilidad. Las cuentas existentes reciben automáticamente los ejercicios que les falten sin duplicar ni sobrescribir sus movimientos personalizados.

Cada ejercicio del catálogo base tiene una asignación visual explícita y autoalojada con las posiciones necesarias para reconocer su técnica. No se reutilizan imágenes por similitud de nombre o categoría y no se usan GIF: las demostraciones estáticas son más claras, accesibles y ligeras. Los ejercicios personalizados sin un recurso validado muestran ese estado de forma explícita. Las guías aparecen en la biblioteca y durante el entrenamiento guiado; una vez abiertas quedan disponibles sin conexión mediante el Service Worker.

Exercise data by [RepDB](https://repdb.co). Parte de las imágenes complementarias procede de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db). Las licencias y revisiones empleadas se detallan en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

En el primer acceso, un asistente guiado solicita datos corporales, objetivo, experiencia, disponibilidad, equipamiento, prioridades musculares y movimientos sensibles. Con esa información genera un plan de 2 a 6 días, ajusta volumen, RPE/RIR, tempo y descansos, y configura progresión lineal, Greyskull LP o doble progresión. La metodología toma de los documentos de referencia los principios de tensión mecánica, control excéntrico, recuperación y sobrecarga progresiva, excluyendo automáticamente prácticas de alto riesgo como negativas supramáximas, presses tras nuca y fallo obligatorio. La rutina puede regenerarse desde **Perfil** sin borrar el historial de sesiones.

## Inicio local

1. Copia `.env.example` a `.env`.
2. Genera un `SESSION_SECRET` aleatorio y un par VAPID; no reutilices las claves del ejemplo.
3. Ajusta `APP_PORT`, `RP_ID` y `EXPECTED_ORIGIN` si no usarás `http://localhost:8080`.
4. Ejecuta:

   ```sh
   docker compose up -d --build
   ```

5. Abre el valor de `EXPECTED_ORIGIN` y crea una cuenta con usuario y contraseña o con Passkey.

Para detener la aplicación sin borrar los datos:

```sh
docker compose stop
```

Los datos activos se guardan en `data/db.json` y `data/state-<id>.json`. Los archivos `*.example.json` documentan el esquema y sí pueden versionarse; los datos activos y `.env` están excluidos por `.gitignore`.

## Producción

WebAuthn y las API PWA requieren un contexto seguro. `localhost` es válido para desarrollo; cualquier acceso desde otro equipo debe publicarse por HTTPS. Configura en `.env` el hostname exacto como `RP_ID` y la URL HTTPS completa como `EXPECTED_ORIGIN`, y termina TLS delante del Nginx incluido sin separar el origen de `/api`.

Antes de exponer el servicio:

- conserva `APP_BIND_ADDRESS=127.0.0.1` si hay otro proxy TLS en el host;
- respalda la carpeta `data/` y restringe sus permisos al usuario del servicio;
- mantiene `.env` fuera del control de versiones;
- rota `SESSION_SECRET` y las claves VAPID si se filtran.

La documentación específica está en `backend/README.md` y `frontend/README.md`.
