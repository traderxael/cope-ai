# Diseño: catálogo "Temas"

## Intento

Agregar un catálogo navegable de temas de aprendizaje con contenido investigado, para que el usuario pueda explorar áreas nuevas desde la app. Se eligió la opción 2 (sección "Temas" nueva), aprobada por el usuario.

## Objetivos

- Ocho temas en tres áreas: Tecnología (motores de reacción, computación, IA), Ciencias (física, ciencias naturales) y Humanidades (artes, historia, economía).
- Cada tema muestra: qué es, cómo funciona, un ejemplo concreto y enlace a la fuente consultada.
- Accesible desde la barra lateral (desktop y móvil).

## No objetivos

- No copiar texto de Wikipedia ni de terceros: se escriben resúmenes propios y se cita la URL como fuente.
- No agregar dependencias ni servicios externos: es contenido estático en el bundle.
- No modificar el generador de arte 3D ni el sistema de insignias.

## Restricciones

- Íconos existentes para la lista; arte 3D nuevo para las fichas (ver abajo).
- Mismo tema oscuro y componentes `Dialog`/`Icon` ya usados.
- Sin secretos, sin llamadas de red en runtime.

## Enfoque elegido

1. `src/lib/topics.ts`: datos estáticos `Topic[]` con `id`, `label`, `area`, `icon`, `what`, `how`, `example`, `source`.
2. `TopicsDialog.tsx`: lista agrupada por área; al elegir un tema se muestra su ficha. Reutiliza `Dialog`.
3. Entrada "Temas" en `Sidebar` y `MobileSidebar`, y estado `topicsOpen` en `App.tsx`.
4. Estilos en `astra.css`.

## Pruebas

- `topics.test.ts`: 8 temas, 3 áreas, íconos válidos, fuentes https.
- `TopicsDialog.test.tsx`: agrupa por área, abre la ficha, enlace con `rel="noreferrer"`.

## Muestras 3D (segunda tanda)

El usuario pidió modelos 3D interactivos por tema. Se generaron 8 GLB con
Hyper3D Rodin (tier Gen-2.5-Low, 0.5 créditos c/u, 29.4 → 25.4 disponibles) y
se optimizaron con Blender (decimación 0.15, sin texturas embebidas, colores
Astra): 1.6–3 MB c/u en `public/models/`. Se agregó `@google/model-viewer`
como dependencia npm (compatible con la CSP `script-src 'self'`) y un visor
`ModelViewer.tsx` que permite girar y acercar. Cada tema incluye `model` y
`preview`; el preview (generado por Rodin) sirve de respaldo visual si WebGL
no está disponible. Los GLB no usan DRACO/KTX2, así que no se descargan
decodificadores externos.

## Fuentes consultadas

es.wikipedia.org: Motor de reacción, Ciencias de la computación, Inteligencia artificial, Física (vía Ciencias naturales), Ciencias naturales, Arte, Historia, Economía.
