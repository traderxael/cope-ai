// jsdom no soporta WebGL ni el custom element real de @google/model-viewer.
// Registramos un sustituto mínimo para que los tests puedan crear el elemento.
export function installModelViewerMock() {
  if (typeof customElements === 'undefined') return;
  if (customElements.get('model-viewer')) return;
  class MockModelViewer extends HTMLElement {}
  customElements.define('model-viewer', MockModelViewer);
}
