# FORJA

> Entrena. Registra. Evoluciona.

PWA privada para registrar entrenamiento y peso corporal. React y la API Node se publican bajo un único origen mediante Vercel en producción o Nginx en local. Neon conserva los datos de producción; Docker mantiene disponible el almacenamiento JSON para desarrollo. Las cuentas pueden usar usuario y contraseña, Passkeys/WebAuthn o ambos métodos; Service Worker y Web Push funcionan bajo el mismo dominio.

Incluye seguimiento de composición corporal con IMC, método de perímetros US Navy, masa magra, FFMI, gasto energético Mifflin–St Jeor y macros por objetivo. Un recordatorio mensual dentro de la PWA y mediante Web Push solicita repetir los perímetros; se reprograma al guardar una medición válida y puede aplazarse siete días. La cadena de calculadoras toma inspiración funcional de [BodyCalc](https://github.com/castellanosfelipe/Body_Calc), publicado bajo licencia MIT, y guarda cada medición en el JSON privado del usuario.

La biblioteca incorpora un catálogo base de **195 ejercicios** en 16 categorías: pecho, espalda, hombros, brazos, agarre, grupos de pierna, core, cuerpo completo, halterofilia, cardio y movilidad. Las cuentas existentes reciben automáticamente los ejercicios que les falten sin duplicar ni sobrescribir sus movimientos personalizados.

Cada ejercicio del catálogo base tiene una asignación visual explícita y autoalojada con las posiciones necesarias para reconocer su técnica. No se reutilizan imágenes por similitud de nombre o categoría y no se usan GIF: las demostraciones estáticas son más claras, accesibles y ligeras. Los ejercicios personalizados sin un recurso validado muestran ese estado de forma explícita. Las guías aparecen en la biblioteca y durante el entrenamiento guiado; una vez abiertas quedan disponibles sin conexión mediante el Service Worker.

Exercise data by [RepDB](https://repdb.co). Parte de las imágenes complementarias procede de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db). Las licencias y revisiones empleadas se detallan en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Los ejercicios propios permiten añadir una imagen PNG, JPG o WebP con descripción del movimiento. Se optimiza localmente antes de guardarse; es una referencia del usuario, no una certificación de la técnica.

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

## Producción en Vercel + Neon

WebAuthn y las API PWA requieren HTTPS y un origen estable. El proyecto incluye una función Node en `/api`, persistencia PostgreSQL para Neon, programación durable de descansos con QStash, cron de recuperación y el fallback correcto de React Router.

Sigue la [guía de publicación en Vercel + Neon](docs/vercel-neon.md) para configurar el dominio, las variables, migrar los JSON existentes y validar contraseña, passkeys y notificaciones. El dominio debe decidirse antes de registrar passkeys; las URLs variables de Preview no sustituyen el dominio de producción.

La documentación técnica adicional está en `backend/README.md`, `frontend/README.md` y la [guía de operación, copias y recuperación](docs/production.md).
