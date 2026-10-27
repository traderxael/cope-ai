# Cope AI

[![CI](https://github.com/traderxael/cope-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/traderxael/cope-ai/actions/workflows/ci.yml)

Tutor de estudio y asistente AI original, empaquetado como PWA instalable. Incluye
modo demo sin clave, streaming, estilos de tutor, práctica de 5 o 10 preguntas
con dificultad y temporizador, progreso local, flashcards con repaso espaciado,
plan de examen, escaneo de tareas con cámara, contexto de imágenes y PDF,
historial local y una identidad visual propia.

> Cope AI es un proyecto independiente. No tiene afiliación con Astra AI ni usa
> su código, recursos, textos o marca. La app no se construyó descompilando ni
> extrayendo un APK de terceros.

## Capturas

| Escritorio | Móvil |
| --- | --- |
| <img src="docs/desktop-light.png" alt="Cope AI en escritorio" width="720" /> | <img src="docs/mobile-light.png" alt="Cope AI en móvil" width="220" /> |

| Tutor y configuración | Plan de examen |
| --- | --- |
| <img src="docs/tutor-desktop.png" alt="Panel del tutor con estilo, materia, nivel y práctica" width="640" /> | <img src="docs/study-plan.png" alt="Plan de examen con tareas por día" width="640" /> |

<p align="center">
  <img src="docs/conversation-demo.png" alt="Conversación de ejemplo en modo demo" width="760" />
</p>

Capturas reales del build de producción en modo demo, sin clave configurada.

## Empezar

Requisitos: Node.js 22.22+ y npm 11+.

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173`. Sin variables de entorno, Cope AI arranca en
**modo demo**: podés probar chat, streaming, tutor, quiz, adjuntos e historial
sin ninguna clave.

### Conectar un proveedor real

1. Copiá el ejemplo a tu entorno local:

   ```bash
   cp .env.example .env.local
   ```

2. Completá `.env.local` con tu proveedor. **El archivo está ignorado por git.**

   ```dotenv
   OPENAI_API_KEY=tu_clave
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=tu_modelo
   ```

3. Reiniciá `npm run dev`. El banner de demo desaparece cuando el servidor
   detecta clave y modelo.

La clave se lee **solo del lado servidor**. Nunca uses variables `VITE_*` para
secretos: todo lo que empieza con `VITE_` se incluye en el bundle público.

### Proveedores compatibles

Cualquier endpoint compatible con `POST {base}/chat/completions` y streaming SSE.
La base URL puede incluir o no `/chat/completions` al final.

- **OpenAI:** `OPENAI_BASE_URL=https://api.openai.com/v1`
- **OpenRouter:** `OPENAI_BASE_URL=https://openrouter.ai/api/v1`
- **Ollama local:** `OPENAI_BASE_URL=http://localhost:11434/v1`; usá cualquier
  valor no vacío como clave y el modelo instalado.
- **Otros:** revisá que soporten streaming y, si querés quiz/imágenes, JSON mode
  y visión.

Variables opcionales:

| Variable | Para qué |
| --- | --- |
| `OPENAI_TOKEN_PARAM` | `max_tokens` (default) o `max_completion_tokens` según el proveedor |
| `OPENAI_JSON_MODE=1` | Envía `response_format: json_object` al generar práctica |
| `OPENAI_VISION=0` | Rechaza imágenes en el servidor |
| `COPE_DEMO=1` | Fuerza modo demo aunque haya clave (útil para E2E) |
| `COPE_DEMO_DELAY_MS` | Ritmo del streaming demo (default 15) |
| `COPE_RATE_LIMIT_PER_MINUTE` | Límite por IP para chat (default 10) |
| `COPE_QUIZ_RATE_LIMIT_PER_MINUTE` | Límite por IP para práctica (default 5) |
| `COPE_STUDY_RATE_LIMIT_PER_MINUTE` | Límite por IP para flashcards y planes (default 5) |

## Funciones

- **Tutor:** materia, nivel y dos estilos. **Guiado** da pistas y preguntas para
  que resuelvas vos; **Solución** muestra el procedimiento completo y la
  comprobación.
- **Práctica:** 5 o 10 preguntas, dificultad, tema opcional y modo con tiempo.
  Corrige al instante, explica cada respuesta y guarda el resultado.
- **Progreso:** precisión global y por materia, racha de días y últimas
  prácticas, calculado sobre el historial local.
- **Flashcards:** generación por materia o tema (también desde el último PDF),
  repaso con repetición espaciada y decks persistentes.
- **Plan de examen:** 3 a 14 días, fecha y temas; tareas de estudio, práctica,
  repaso y descanso con avance marcable.
- **Asistente:** chat general con markdown, tablas, código y matemáticas KaTeX.
- **Adjuntos:** hasta 2 imágenes por conversación (redimensionadas a JPEG), foto
  de tarea con la cámara trasera y un PDF por mensaje (texto extraído localmente,
  sin OCR).
- **Historial local:** conversaciones, prácticas, decks y planes en IndexedDB; el
  servidor no los guarda.
- **Streaming real:** SSE desde el proxy, con botón de detener y reintento.
- **Modo demo:** respuestas deterministas en español, sin claves.
- **PWA:** instalable, shell offline, fuentes empaquetadas y aviso de actualización.
- **Temas:** claro, oscuro y sistema.

### Datos de estudio

Los resultados de práctica, decks y planes viven en IndexedDB (versión 2) en este
dispositivo. No hay cuentas ni sincronización. **Ajustes → Borrar todo** elimina
conversaciones, prácticas, flashcards y planes; también podés borrar un deck o un
plan desde su panel.

## Arquitectura

```text
┌──────────────────────────┐
│  PWA React + TypeScript  │
│  IndexedDB local         │
└────────────┬─────────────┘
             │ /api/chat (SSE) · /api/quiz · /api/flashcards ·
             │ /api/study-plan (JSON)
             ▼
┌──────────────────────────┐
│  Handlers compartidos    │  dev/preview: middleware Vite
│  validación + límites    │  producción: funciones Vercel
│  prompts + seguridad     │
└────────────┬─────────────┘
             │ Authorization: Bearer (solo servidor)
             ▼
┌──────────────────────────┐
│  Proveedor OpenAI-       │
│  compatible              │
└──────────────────────────┘
```

- `shared/`: contratos zod (chat, quiz, flashcards y plan), parser SSE,
  extracción y reparación de JSON reutilizados por cliente y servidor.
- `server/`: configuración, prompts, proveedores, rutas y seguridad. Las rutas
  de estudio reintentan una vez si el proveedor devuelve JSON inválido.
- `api/`: adaptadores finos para Vercel.
- `src/`: interfaz, almacenamiento local, SRS, progreso, adjuntos y cliente SSE.

### Estructura

```text
api/                    funciones Vercel
server/                 lógica del proxy y del proveedor
shared/                 esquemas y utilidades compartidas
src/                    PWA React
e2e/                    pruebas Playwright
twa/                    configuración y pasos para Android
scripts/                generación de iconos
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con API local |
| `npm run build` | Typecheck + build de producción |
| `npm run preview` | Sirve el build con el mismo proxy API |
| `npm run typecheck` | TypeScript de cliente y servidor |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (unidad, integración y componentes) |
| `npm run test:e2e` | Build + Playwright en modo demo |
| `npm run verify` | Typecheck + lint + tests + build |
| `npm run icons` | Regenera los iconos PWA desde `public/logo.svg` |

## Seguridad y límites

- Secretos únicamente en `.env.local` o variables de Vercel. `.env.example` no
  contiene valores.
- Validación zod antes de llamar al proveedor; se descartan roles `system`
  enviados por el cliente.
- Topes: 3 MB por body, 24 mensajes, 24.000 caracteres por mensaje, 32.000 en
  total, 2 imágenes de hasta 1,2 MB como data URL, 1 PDF por mensaje (20 páginas
  y 20.000 caracteres extraídos), 1.200 tokens de salida por respuesta de chat.
  Práctica: 5 o 10 preguntas y 5.000 tokens. Flashcards: 6 a 10 tarjetas,
  8.000 caracteres de material y 2.500 tokens. Plan: 3 a 14 días, 8 temas y
  3.000 tokens.
- Rate limit en memoria por IP: 10 chat/min, 5 práctica/min y 5 generaciones de
  estudio/min. **No es un límite distribuido**: en serverless cada instancia
  tiene su propia memoria.
- Errores sanitizados: nunca se devuelven claves, headers ni cuerpos crudos del
  proveedor.
- Markdown sin HTML crudo, protocolos permitidos y KaTeX sin `trust`.
- CSP y cabeceras de seguridad en `vercel.json`; el service worker nunca cachea
  `/api`.

### Antes de exponer una clave en producción

Cope AI **no tiene autenticación**. Si desplegás una URL pública con tu clave,
cualquiera puede consumir tu cuota. Antes de hacerlo:

1. Configurá un **tope de gasto** en el proveedor.
2. Usá rate limiting/WAF de Vercel (el límite en memoria es solo una primera
   barrera).
3. Considerá agregar autenticación o un access gate en una versión futura.

## Despliegue en Vercel

1. Importá el repo en Vercel. El framework se detecta como Vite; el build es
   `npm run build` y la salida `dist`.
2. Cargá `OPENAI_API_KEY`, `OPENAI_BASE_URL` y `OPENAI_MODEL` como variables de
   entorno (Production y Preview). No las pongas en el repo.
3. Desplegá. Las funciones `api/chat.ts`, `api/quiz.ts`, `api/flashcards.ts` y
   `api/study-plan.ts` se despliegan con el proyecto; `vercel.json` fija
   `maxDuration` y las cabeceras/CSP.
4. Verificá `/api/health` y una conversación real. El streaming en producción
   requiere el runtime Node de Vercel.
5. Instalá la PWA desde Chrome en Android o escritorio.

## PWA y Android (TWA)

La app ya incluye manifest, iconos, service worker, shell offline y aviso de
actualización. Para publicarla en Play Store hace falta empaquetarla como TWA;
los pasos, el manifest de ejemplo y los placeholders de firma están en
[`twa/README.md`](twa/README.md).

El APK/AAB **no se compila en este repo** ni en la máquina de desarrollo
original: requiere Android SDK, Gradle, un keystore propio y Play Console.

## Pruebas

- **Unitarias/integración:** parser SSE, esquemas de chat/quiz/estudio, prompts,
  rate limit, proveedor con upstream falso, reparación de JSON, SRS, progreso,
  IndexedDB con migración v1→v2, payload y adjuntos.
- **Componentes:** tutor, cámara, markdown seguro, quiz, composer y lista de
  mensajes.
- **E2E:** Chrome/Chromium real contra el build de producción en modo demo:
  asistente, persistencia, estilo de tutor, práctica de 10 con tiempo y
  progreso, flashcards con repaso, plan de examen, cámara, PDF, borrado durante
  streaming, PWA/offline, accesibilidad de los diálogos y capturas.

```bash
npm run verify
npm run test:e2e
```

Las llamadas a un proveedor real y el despliegue en Vercel no se ejecutan en la
suite automática porque dependen de tu clave y tu cuenta.

## Privacidad

- Las conversaciones, imágenes procesadas, texto extraído de PDF, resultados de
  práctica, decks y planes se guardan en IndexedDB en tu navegador.
- El PDF original no se sube desde el dispositivo: solo viaja el texto extraído.
- Las imágenes (incluidas las fotos de tarea) y los mensajes sí se envían al
  proveedor configurado cuando usás IA real.
- Cope AI no incluye analítica, cuentas ni sincronización en la nube.

## Licencia

MIT. Ver [LICENSE](LICENSE). Las fuentes y dependencias de terceros se detallan
en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
