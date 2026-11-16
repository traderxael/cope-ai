# SDD ledger — plan: C:\Users\USUARIO\.opencode\plan\cope-ai-mejoras-pendientes.md

Workspace: rama `feat/3d-badges-eta-missions` en `C:\Users\USUARIO\cope-ai`.
Estado inicial: commit `1a550bf` (rediseño Astra del panel de insignias, antes sin commitear). `npm run verify` en verde.
Pre-flight: no shared interfaces — las tareas previas del plan ya están implementadas en `b7f6bc5` y `1a550bf`.

Ruling: el usuario pidió además "casi igual a Astra AI". Se mantiene el aislamiento legal del README/HANDOFF: paridad de funciones y lenguaje visual propio, sin copiar marca/textos/arte/código. Coste si me equivoco: el usuario esperaba un clon 1:1; se le comunicó el límite.

Tareas nuevas acordadas: insignias-concepto con explicación al desbloquear + arte 3D propio; paridad de funciones (duelos, estrellas, desafíos).

- [x] Nuevas insignias-concepto (datos + arte 3D + diálogo de concepto) — commit `0524cee`, 434 tests
- [x] Paridad de funciones con Astra AI: estrellas, desafíos y duelo — commit `81ff04c`, 444 tests
- [x] Ajuste visual y capturas — commit `41c1117`, E2E visual 7/7, tema `#0d0d0d` como el manifest de Astra

Ruling: el cambio de fondo a `#0d0d0d` se hizo en `tokens.css` + manifest PWA/TWA, sin tocar `app.css`, para mantener la reversibilidad. Coste si me equivoco: el azul espacial anterior se pierde; se puede revertir con un solo commit.

Ruling: el duelo usa la API de práctica existente y un rival determinista por porcentaje, en lugar de un endpoint nuevo — evita tocar el proxy y mantiene "sin servicios de pago". Coste si me equivoco: menos imprevisibilidad que un rival real.
