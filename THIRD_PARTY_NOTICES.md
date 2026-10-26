# Third-party notices

Cope AI usa paquetes open source. Las versiones exactas y sus dependencias están
fijadas en `package-lock.json`; los textos de licencia de los paquetes se
incluyen en `node_modules` al ejecutar `npm install`.

## Fuentes

- **Fraunces** — Copyright 2020 The Fraunces Project Authors.
  SIL Open Font License 1.1. Texto completo en
  [`public/licenses/fraunces-OFL.txt`](public/licenses/fraunces-OFL.txt).
- **Public Sans** — Copyright 2015 The Public Sans Project Authors.
  SIL Open Font License 1.1. Texto completo en
  [`public/licenses/public-sans-OFL.txt`](public/licenses/public-sans-OFL.txt).

Las fuentes se empaquetan con la app a través de Fontsource; no se cargan desde
Google Fonts en tiempo de ejecución.

## Librerías principales

La aplicación incluye, entre otras, React, Vite, Zod, idb, React Markdown,
remark, rehype, KaTeX, highlight.js y PDF.js, cada una bajo su propia licencia
(MIT, ISC, BSD o Apache-2.0 según el paquete). Consultá el campo `license` de
cada paquete en `node_modules` para el texto y la atribución correspondientes.

El código original de Cope AI se distribuye bajo la licencia MIT de
[`LICENSE`](LICENSE).
