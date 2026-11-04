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
`src/lib/studyLog.test.ts`, `src/lib/generationProgress.test.ts`.

Para ver la barra de carga hace falta una respuesta que tarde: con la IA de
nube gratuita (Pollinations) la espera es visible de entrada; con fixtures
(`COPE_DEMO=1`) es demasiado rápida.

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

## Decisiones de diseño a respetar

- **Sin servicios de pago ni claves.** El motor por defecto sigue siendo
  Pollinations gratuito; Ollama local y una clave propia siguen siendo
  opcionales. La barra *no* promete tiempos que el motor no puede cumplir: si
  la respuesta se pasa del tiempo estimado, muestra "tarda más de lo previsto".
- **La barra nunca miente.** No marca 100 % hasta que la respuesta termina de
  verdad; la fase de espera se queda por debajo del 72 % de forma asintótica.
- **Cero dependencias nuevas.** Solo SVG y CSS; no se agregaron librerías.
- **Aislamiento legal.** Astra AI no se copia: no se usa su código, sus
  textos, sus recursos ni su marca. El proyecto ya declaraba esto en el
  README y la nota sigue siendo válida. Los nombres de las insignias son
 (genéricos de la temática espacial) y el arte es original.
- **Reversibilidad.** El re-tema vive en `tokens.css` + `astra.css`. Si el
  resultado visual no convence, revertir esos dos archivos y
  `src/lib/theme.ts` devuelve la app a su estado anterior.

## Qué queda pendiente (sugerencias, no bloquean)

1. **Iconografía 3D real.** Hoy las insignias son SVG con degradados. Para
   seguir de cerca la referencia, se pueden generar PNG con render 3D
   (Blender) y reemplazar `BadgeArt.tsx` conservando los mismos nombres de
   icono. El repo ya tiene `scripts/generate-icons.mjs` para los iconos PWA.
2. **Más^−1 sensores de la barra.** La estimación se apoya solo en la duración
   observada. Con el historial se podría estimar también por tokens o por
   longitud del prompt.
3. **Meta diaria por minuto de chat.** Hoy la meta suma prácticas y sesiones de
   enfoque; se podría sumar también el tiempo activo con el tutor abierto.
4. **Capturas de `docs/`.** Ya se regeneraron con el tema nuevo durante esta
   tanda (las produce la suite E2E en `test-results/screenshots/`). Si se vuelve
   a tocar el diseño hay que copiarlas de nuevo a `docs/`.
5. **Insignias de hitos de práctica.** La grilla actual es solo por racha.
   `src/lib/progress.ts` ya tiene `achievements()` con logros por práctica
   (precisión, cantidad); se puede sumar una segunda grilla "Misiones" en el
   mismo panel.
6. **Accesibilidad.** La barra usa `role="progressbar"` con `aria-valuenow`,
   pero conviene verificar el anuncio con lector de pantalla (el texto de
   `aria-live` en `MessageList.tsx` dice "Cope está respondiendo."). La suite
   E2E de accesibilidad (`e2e/accessibility.spec.ts`) cubre los diálogos, pero
   no el panel de insignias nuevo.

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
