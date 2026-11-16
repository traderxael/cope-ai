import '@google/model-viewer';
import { useEffect, useRef, useState } from 'react';

interface ModelViewerProps {
  src: string;
  label: string;
  preview: string;
}

/** Visor 3D interactivo con vista previa de respaldo si WebGL falla. */
export function ModelViewer({ src, label, preview }: ModelViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    container.innerHTML = '';
    const el = document.createElement('model-viewer') as HTMLElement & {
      src: string;
      alt: string;
    };
    el.src = src;
    el.alt = label;
    el.setAttribute('src', src);
    el.setAttribute('alt', label);
    el.setAttribute('camera-controls', '');
    el.setAttribute('auto-rotate', '');
    el.setAttribute('rotation-per-second', '18deg');
    el.setAttribute('shadow-intensity', '0.4');
    el.setAttribute('exposure', '1.1');
    el.setAttribute('min-camera-orbit', 'auto 60deg 40%');
    el.setAttribute('max-camera-orbit', 'auto 120deg 160%');
    el.setAttribute('interaction-prompt', 'none');
    el.style.width = '100%';
    el.style.height = '260px';
    el.style.display = failed ? 'none' : 'block';
    el.style.borderRadius = '14px';
    el.style.background = 'transparent';
    el.addEventListener('error', () => setFailed(true));
    container.appendChild(el);
    return () => {
      container.innerHTML = '';
    };
  }, [src, label, failed]);

  return (
    <div className="topicModel">
      <div className="topicModelStage" style={{ backgroundImage: `url(${preview})` }}>
        <div ref={host} className="topicModelHost" />
        {failed ? (
          <p className="topicModelFallback">Vista previa 3D · girala con un navegador compatible</p>
        ) : null}
      </div>
      <p className="topicModelHint">Arrastrá para girar · rueda para acercar</p>
    </div>
  );
}
