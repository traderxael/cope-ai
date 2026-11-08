# Traspaso: rediseño Astra, barra de carga y gamificación

> Documento de continuidad para otra IA (o para otra sesión). Describe el
> estado del trabajo, las decisiones tomadas y lo que queda por hacer.
> Proyecto: `traderxael/cope-ai` — tutor de estudio PWA con IA gratuita.

## Contexto

El usuario pidió tres cosas sobre Cope AI:

1. **Mejorar el proyecto** y agregar **una barra de carga** que indique cuánto
   falta y cuándo estará lista la respuesta.
2. **Hacerlo igual que Astra AI** (referencia visual: capturas de pantalla
   de `app.astra-ai.co`), pero **gratis**: sin servicios de pago, sin claves
   propias, sin copiar código ni marca de terceros.
3. Si no se terminaba, **dejar este `.md`** para que otra IA continuara.

Decisiones confirmadas por el usuario:

| Decisión | Valor |
| --- | --- |
| Alcance del rediseño | Toda la app en tema oscuro estilo Astra (se mantienen claro/oscuro/sistema) |
| Gamificación | Sí: insignias + racha + meta diaria |
| Entrega | Rama nueva + Pull Request a `main` |

## Estado: implementado y verificado

Todo lo de esta lista está en la rama `feature/astra-ui-progress-badges`,
con `npm run verify` en verde (typecheck + lint + tests + build).

### 1. Identidad visual Astra

El CSS base (`src/styles/app.css`, 5102 líneas) **no se tocó**. El re-tema se
hizo por dos vías, para que el cambio sea reversible con un solo revert:

- **`src/styles/tokens.css` (reescrito)**: paleta Astra (índigo `#6d8bff`,
  violeta `#a06bff`, cian `#4fd8ff`), fondo espacial `#070a15`, superficies
  translúcidas y tipografía sans de peso alto. El tema oscuro es ahora el
  predeterminado (`src/lib/theme.ts` devuelve `'dark'` si no hay preferencia
  guardada). Los tokens nuevos (`--astra-grad`, `--astra-glow`, `--glass`,
  `--ring-1/2/3`) se usan desde `astra.css`.
- **`src/styles/astra.css` (nuevo)**: capa de overrides importada después de
  `app.css` en `src/main.tsx`. Aplica glassmorphism a paneles y tarjetas,
  botones píldora con gradiente, fondo con estrellas, estilos de la barra de
  progreso, grilla de insignias, anillo de meta y racha semanal.

> El archivo original solo tenía 20 colores hardcodeados, así que el re-tema
> por tokens cubre la app completa sin reescribir el CSS.

### 2. Barra de carga con tiempo estimado

- **`src/lib/generationProgress.ts`**: matemática del avance y estimación de
  tiempos. La barra es **asintótica**: crece hacia 72 % mientras espera el
  primer token y nunca se completa sola; al llegar texto pasa a 72–100 % según
  los caracteres recibidos. El ETA usa la mediana de las últimas mediciones
  guardadas en `localStorage` (`cope-gen-estimates-v1`) y, si no hay historial,
  el valor por defecto del proveedor (Pollinations 25 s, Ollama 20 s,
  OpenAI 8 s, fixtures 0,4 s).
- **`src/components/GenerationProgress.tsx`**: la barra con fase
  ("Preparando…" / "Escribiendo…"), contador ("quedan ~12 s" o "tarda más de
  lo previsto") y pista contextual.
- **`src/features/assistant/useChatApp.ts`**: expone `generationStatus`
  (`startedAt`, `firstTokenAt`, `chars`), lo mantiene sincronizado con el
  streaming y **guarda una medición real** al terminar cada respuesta.
- **`src/components/MessageList.tsx`**: muestra la barra bajo el mensaje que
  se está generando; la etiqueta pasa de "Preparando…" a "Escribiendo…".
- **`src/App.tsx`**: la pantalla de arranque ahora usa una barra de progreso
  (`BootProgress`) en lugar del spinner.

### 3. Gamificación (insignias, racha, meta diaria)

- **`src/lib/achievements.ts`**: 12 insignias en tres órbitas, con el estilo de
  nombres de la referencia (Primer cohete, Órbita terrestre, Órbita lunar,
  Órbita marciana, Órbita joviana, Órbita solar, Asteroide, Cometa, Nebulosa,
  Galaxia, Supernova, Universo). El arte es **SVG propio**, no recursos de
  terceros.
- **`src/lib/studyLog.ts`**: registro local de minutos de estudio por día
  (`cope-study-log-v1`), racha de días consecutivos, meta diaria configurable
  (`cope-study-goal`, 15/30/45/60/90 min).
- **`src/features/achievements/BadgeArt.tsx`**: ilustración vectorial con
  degradados radiales y brillos para cada insignia.
- **`src/features/achievements/BadgeDialog.tsx`**: panel con racha actual y
  mejor racha, próxima insignia y días que faltan, racha semanal, anillo de
  meta diaria y grilla de insignias por órbita.
- Entrada: botón **"Insignias"** en la barra lateral (desktop y móvil) y
  enlace "Ver insignias" dentro de Progreso.
- Los minutos se suman al terminar una práctica (`durationSeconds`) y al
  completar un bloque de modo enfoque (`FocusDialog` ahora mide el tiempo
  real y notifica).

## Cómo verificar

```bash
npm ci
npm run verify        # typecheck + lint + tests + build
npm run dev           # http://localhost:5173
npm run test:e2e      # Playwright (opcional, tarda)
```

Tests agregados: `src/lib/achievements.test.ts`,
`src/lib/studyLog.test.ts`, `src/lib/generationProgress.test.ts`,
`src/lib/theme.test.ts`, `src/lib/toastQueue.test.ts`.

Para ver la barra de carga hace falta una respuesta que tarde: con la IA de
nube gratuita (Pollinations) la espera es visible de entrada; con fixtures
(`COPE_DEMO=1`) es demasiado rápida.

## Segunda tanda: arranque en oscuro y pantalla de bienvenida

Después del merge del rediseño quedaron sueltos dos detalles del tema:

- `public/theme-init.js` resolvía el tema por la preferencia del sistema, así
  que la app **pintaba en claro antes de montar React** y después saltaba al
  oscuro. Ahora coincide con `getStoredTheme()`: sin preferencia guardada
  arranca en oscuro, y "system" se respeta explícitamente.
- `index.html`, `vite.config.ts` (manifest de la PWA) y `twa/twa-manifest.json`
  seguían con la paleta crema/terracota original. Ya usan la paleta Astra.
- La pantalla de bienvenida (`.onboardingScreen`) conservaba el look cálido.
  Ahora usa tokens propios (`--onb-*` en `tokens.css`), porque es oscura en los
  dos temas, y la capa `astra.css` la repinta: fondo espacial con estrellas,
  tarjeta de cristal, botón gradiente y acentos cian.

## Tercera tanda: dos bugs reales de la capa oscura y de los avisos

Con el tema oscuro como predeterminado aparecieron dos defectos que no eran
solo de tests. Los dos quedaron corregidos y con guarda de regresión.

### 1. El toast quedaba fuera de pantalla en tema oscuro

`astra.css` tenía esta regla para que el fondo con estrellas quedara detrás
del contenido:

```css
[data-theme='dark'] .appShell > * {
  position: relative;   /* ← pisaba el position: fixed del toast */
  z-index: 1;
}
```

El `.toast` es hijo directo de `.appShell`, así que en oscuro perdía su
`position: fixed` y, al ser `.appShell` un flex container, quedaba en
`left: 50%` de una caja de 1440 px pero desplazado: se medía en `x=1662,
y=-92` en un viewport de 1440×900. El aviso seguía en el DOM, pero el usuario
no lo veía.

**Arreglo** (en `src/styles/astra.css`): no tocar `position` de los hijos. Las
estrellas pasan a `z-index: -1` y `.appShell` gana `isolation: isolate`, que
crea un contexto de apilamiento propio: así quedan por encima del fondo del
shell y por debajo del contenido, sin forzar el posicionamiento de nadie.

```css
.appShell { isolation: isolate; }
[data-theme='dark'] .appShell::before { z-index: -1; }
```

### 2. Un aviso tapaba y perdía al anterior

El sistema de avisos guardaba **un solo mensaje**. Cuando la PWA terminaba de
instalarse (`onOfflineReady`) y avisaba "Cope AI está listo para usarse sin
conexión", ese mensaje **reemplazaba** al "Enfoque completado" de una sesión
de enfoque, que se perdía. La carrera depende del service worker, así que
aparecía de forma intermitente.

**Arreglo**: los avisos ahora se **encolan** (`src/lib/toastQueue.ts`, con
`src/lib/toastQueue.test.ts`). El que está en pantalla es el primero de la
cola; cuando se descarta, pasa el siguiente. `Toast.tsx` ahora recibe
`onDismiss(id)` para poder sacar solo el aviso que corresponde.

### 3. La cola perdía avisos: el `id` se leía tarde

Con la cola, el E2E de enfoque seguía fallando en CI. La causa era el `id`:

```js
// MAL: el id se lee DENTRO del updater, que React ejecuta más tarde
toastIdRef.current += 1;
setToasts((current) => enqueueToast(current, { id: toastIdRef.current, ... }));
```

Cuando dos avisos se agregan en el mismo ciclo, React puede ejecutar los dos
updaters **después** de que el contador ya haya subido dos veces: los dos
avisos quedan con **el mismo id**. Al descartar uno, el `filter` se lleva los
dos y el segundo nunca llega a mostrarse.

React solo evalúa el primer updater de forma inmediata ("eager state
computation") si el componente no tiene actualizaciones pendientes, y eso
depende del navegador y del timing: por eso el test pasaba con Chrome local y
fallaba con Chromium de Playwright.

**Arreglo**: el `id` lo deriva la propia cola a partir de su contenido
(`enqueueToast`), sin contadores externos:

```js
const id = queue.reduce((max, item) => Math.max(max, item.id), 0) + 1;
return [...queue, { ...toast, id }];
```

Además, el fin de una sesión de enfoque generaba **dos** avisos para el mismo
evento ("Sesión de enfoque guardada…" y "Enfoque completado…"), que competían
entre sí. Ahora el diálogo manda **un solo** aviso que incluye los minutos:
"Enfoque completado: 25 min para tu meta diaria. Tomate un descanso."

### Cómo reproducir las condiciones del CI en local

El CI corre con Chromium de Playwright (no con Chrome del sistema) y Linux.
Para reproducirlo en Windows:

```bash
CI=1 npx playwright test e2e/focus.spec.ts --repeat-each=3
```

`CI=1` hace que `playwright.config.ts` use el Chromium empaquetado y active
reintentos, igual que GitHub Actions. Con Chrome del sistema (`channel:
'chrome'`) el fallo **no** se reproduce.

> `npx playwright install chromium` deja el navegador en
> `%LOCALAPPDATA%\ms-playwright` (no pide permisos de administrador).

### Guardas de regresión

- `e2e/focus.spec.ts` comprueba que el toast **caiga dentro del viewport**
  (bbox contenida en el tamaño de pantalla), que es exactamente lo que fallaba
  con el bug de `position`.
- `src/lib/toastQueue.test.ts` fija que un aviso nuevo **no** pise al que está
  en pantalla.

> Cómo se debugueó: el fallo se reproducía de forma determinista con
> `npx playwright test e2e/focus.spec.ts --repeat-each=3` (3 de 3 fallos) y
> **no** con una corrida simple. Esa diferencia fue la pista: en las
> repeticiones el service worker ya está en caché y su aviso de "listo sin
> conexión" llega antes, tapando el del modo enfoque.

## Cuarta tanda: fixes de CI portados y conversación con voz real

Esta tanda parte de la base nueva de `main` y vuelve a aplicar los tres
arreglos del PR del arranque en oscuro, además de completar la conversación
con el profesor.

### Fixes de CI portados

- `public/theme-init.js` arranca en oscuro y respeta `system` cuando el usuario
  lo eligió explícitamente; el `catch` también cae en oscuro.
- `src/styles/astra.css` ya no fuerza `position` en `.appShell > *` (eso sacaba
  el toast fijo de pantalla). Ahora `.appShell` usa `isolation: isolate` y las
  estrellas van en `z-index: -1`.
- La cola de avisos vive en `src/lib/toastQueue.ts`, con ids derivados de la
  propia cola y tests. `App` y `Toast` descartan por id y `FocusDialog` manda
  un solo aviso por sesión.
- `e2e/focus.spec.ts` verifica que el toast caiga dentro del viewport.

### Conversación con voz

- **API:** `POST /api/oral-exam` acepta `action: "reply"` con `config`,
  `personality`, `question`, `answer` y `stage` (`initial`, `followup`,
  `closing`). Devuelve `{ reply, followUp, demo }`. El servidor limpia
  `followUp` fuera de `initial` y aplica un rate limit propio
  (`COPE_ORAL_REPLY_RATE_LIMIT_PER_MINUTE`, 20 por defecto) para no chocar con
  el de exámenes.
- **Demo:** el feedback se deriva de los puntos esperados de la pregunta y la
  repregunta apunta al primer punto faltante.
- **Cliente:** `requestOralReply` en `src/lib/api.ts`. El diálogo reemplaza las
  frases fijas por la respuesta real y, si la API falla, sigue con una frase
  local para no cortar la conversación.
- **Manos libres:** se activa por defecto si el navegador soporta dictado. Tras
  cada respuesta final guarda, pide y lee el feedback + repregunta, lee la
  siguiente pregunta y rearma el micrófono. Las guardas por vista, índice y
  cierre evitan rearmar fuera de contexto; la última pregunta no se califica
  sola.
- **Entradas visibles:** el botón **Hablar con Cope** del compositor abre la
  conversación y el botón de dictado escribe en el mensaje. `tts.ts` no se
  bloquea si el navegador no expone voces (caso headless) y tiene timeout.
- **Tests:** `server/routes/oral-exam.test.ts`, `src/lib/toastQueue.test.ts`,
  `src/components/Composer.test.tsx` y `e2e/voice.spec.ts` (simula
  `SpeechRecognition` y `speechSynthesis`, y verifica los pedidos `initial` /
  `followup` / `closing`, la UI, el TTS y el rearme del micrófono).

```bash
npm run verify
npx playwright test e2e/voice.spec.ts e2e/focus.spec.ts e2e/oral-exam.spec.ts
```

## Quinta tanda: insignias 3D, barra sensible al prompt y misiones

Rama `feat/3d-badges-eta-missions` (desde `main`). Cierra tres de los pendientes
de la tanda anterior: iconografía 3D, más sensores de la barra y meta diaria con
chat activo, más la grilla "Misiones". `npm run verify` en verde.

### 1. Insignias con render 3D (Blender)

- **`scripts/render-badges.py`**: genera los 12 PNG con Blender headless
  (Cycles CPU). Idempotente; flags `--only`, `--samples`, `--size`, `--outdir`.
  En esta máquina (CPU sin AVX2, sin GPU) se usa denoiser **off**, 64 samples y
  seed fija para renders limpios y reproducibles.
- **`src/features/achievements/art/*.png`**: 12 renders 512×512 RGBA con esquinas
  transparentes, paleta Astra cohete→universo.
- **`src/features/achievements/BadgeArt.tsx`**: ya no dibuja SVG; importa los PNG
  con Vite y devuelve un `<img alt="">` decorativo (la tarjeta ya nombra la
  insignia). Conserva la API `icon: BadgeIcon`.
- **`src/styles/astra.css`**: `.badgeArt img` (70 px, `object-fit: contain`) y
  `.badgeTile.isLocked .badgeArt img` con grayscale, en lugar de las reglas `svg`.
- Tests: `src/features/achievements/BadgeArt.test.tsx` (img por icono, sin SVG).
- Captura: `e2e/visual.spec.ts` ganó el test "panel de insignias con arte 3D"
  (siembra racha de 9 días, abre el panel, espera los PNG y encuadra Misiones +
  Órbita baja). De ahí se regeneró `docs/astra-badges.jpg`.

### 2. Barra sensible al largo del prompt

- **`src/lib/generationProgress.ts`**: el historial pasa a muestras **pareadas**
  `{promptChars, waitMs, writeMs, chars}` bajo la clave nueva
  `cope-gen-estimates-v2` (la v1 se ignora; el historial viejo no migraba porque
  no guardaba el largo del prompt). Máximo 8 muestras.
  - `estimateWaitMs(provider, promptChars)`: mediana de esperas; con ≥3 pares
    escala por `promptChars / medianaPrompt`, acotado a [0.5, 2].
  - `estimateExpectedChars(promptChars)`: con ≥3 pares usa la mediana de
    `chars/promptChars`; resultado acotado a [120, 6000]; si no, mediana de chars
    o 900.
  - `recordEstimateSample` solo guarda si wait, write y chars son > 0.
- **`useChatApp.ts`**: calcula `promptChars` sumando el texto de los mensajes del
  request y lo lleva en `generationStatus` y en la medición final.
- **`GenerationProgress.tsx`**: pasa `promptChars` a ambas estimaciones.
- Se mantiene la invariante "la barra nunca miente" (espera asintótica < 72 %,
  100 % solo al terminar).

### 3. Meta diaria con chat activo + Misiones

- **`src/lib/chatStudyTime.ts`**: `isChatStudyActive(lastActivityAt, now,
  visible)` (ventana de 5 min y pestaña visible) y `useChatStudyMinutes` que
  registra 1 min por tick estable. **`App.tsx`** lo conecta a
  `chat.lastChatActivityAt`, que `useChatApp` marca al iniciar y al finalizar el
  streaming (no al generar práctica, para no contar dos veces).
- **`src/lib/progress.ts`**: `Achievement` gana `current`, `target` y `progress`;
  `achievements()` devuelve Primer paso (1), Racha de 3 (3), Constancia (10) y
  Puntería (20 preguntas con ≥80 %).
- **`BadgeDialog.tsx`**: nueva sección **Misiones** con `MissionTile` (arte 3D,
  barra `role="progressbar"` y contador `actual/objetivo`). El texto de la meta
  ahora dice que también suma el chat activo con el tutor.
- Tests: `src/lib/chatStudyTime.test.ts`, `src/lib/progress.test.ts` (avance),
  `src/features/achievements/BadgeDialog.test.tsx` (grilla Misiones).

## Decisiones de diseño a respetar

- **Sin servicios de pago ni claves.** El motor por defecto sigue siendo
  Pollinations gratuito; Ollama local y una clave propia siguen siendo
  opcionales. La barra *no* promete tiempos que el motor no puede cumplir: si
  la respuesta se pasa del tiempo estimado, muestra "tarda más de lo previsto".
- **La barra nunca miente.** No marca 100 % hasta que la respuesta termina de
  verdad; la fase de espera se queda por debajo del 72 % de forma asintótica.
- **Cero dependencias nuevas.** El arte 3D son PNG propios generados con Blender
  (herramienta de build, no de runtime); no se agregaron librerías al bundle.
- **Aislamiento legal.** Astra AI no se copia: no se usa su código, sus
  textos, sus recursos ni su marca. El proyecto ya declaraba esto en el
  README y la nota sigue siendo válida. Los nombres de las insignias son
 (genéricos de la temática espacial) y el arte es original.
- **Reversibilidad.** El re-tema vive en `tokens.css` + `astra.css`. Si el
  resultado visual no convence, revertir esos dos archivos y
  `src/lib/theme.ts` devuelve la app a su estado anterior.

## Qué queda pendiente (sugerencias, no bloquean)

La quinta tanda cerró los puntos 1 (iconografía 3D), 2 (sensores de la barra),
3 (meta con chat activo) y 5 (grilla Misiones) de la lista anterior. Queda:

1. **Accesibilidad del panel de insignias.** La barra usa `role="progressbar"`
   con `aria-valuenow` y las misiones exponen `aria-valuemax/now`, pero conviene
   verificar el anuncio con lector de pantalla. `e2e/accessibility.spec.ts`
   cubre los diálogos en general, no el panel de insignias en detalle.
2. **Acentos cálidos del tema claro.** `src/styles/app.css` conserva algunos
   colores cálidos en el bloque "Study suite" (p. ej. `#f5c451` en repaso SRS).
   Se pueden neutralizar desde `astra.css` sin tocar el base. En esta tanda el
   usuario decidió no abordar el pulido visual/a11y, así que sigue pendiente.
3. **Resto de capturas de `docs/`.** Solo se regeneró `astra-badges.jpg` (arte 3D
   + Misiones). Las demás siguen siendo válidas; si se vuelve a tocar el diseño,
   copiarlas de `test-results/screenshots/` como antes.
4. **Historial de estimaciones v1.** La clave pasó a `cope-gen-estimates-v2`; el
   historial v1 (sin largo de prompt) se descartó en vez de migrarse. Las
   primeras respuestas tras actualizar usan los valores por defecto del
   proveedor hasta juntar 3 muestras pareadas.

## Cambios que hicieron falta por el tema oscuro por defecto

Cambiar el tema inicial a oscuro rompió dos supuestos de los tests E2E, que
asumían que la app arrancaba en claro. Se corrigieron:

- `e2e/visual.spec.ts`: ahora captura primero el tema oscuro por defecto y
  después alterna a claro con el botón, en vez de buscar un botón que solo
  existe en modo claro.
- `e2e/assistant.spec.ts`: recorre el ciclo completo oscuro → claro → oscuro.

Además, `storeTheme('system')` borraba la clave de `localStorage`; con el
nuevo tema por defecto eso hacía que "system" se perdiera al recargar y
volviera a oscuro. Ahora `system` se guarda explícitamente y hay un test
nuevo, `src/lib/theme.test.ts`, que lo fija.

## Riesgo conocido

`src/styles/app.css` conserva algunos colores cálidos del tema claro en el
bloque "Study suite" (por ejemplo `#f5c451` en las tarjetas de repaso SRS y
`#1f6f5c` en un badge de conexión). Sobre el tema oscuro nuevo se ven
ligeramente desalineados. Se pueden neutralizar desde `astra.css` sin tocar el
archivo base; es el ajuste visual pendiente más visible.

> Nota: la parte más visible de eso (la pantalla de bienvenida) ya se corrigió
> en la segunda tanda. Lo que queda son acentos puntuales del bloque de repaso
> SRS y el verde del toast de éxito, que son semánticos y no rompen nada.
