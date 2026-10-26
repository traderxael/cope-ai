import { useEffect, useRef, useState, type DragEvent } from 'react';
import { LIMITS } from '../../shared/limits';
import { formatBytes } from '../lib/attachments';
import type { StoredAttachment } from '../lib/storage';
import { Icon } from './Icon';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  attachments: StoredAttachment[];
  onAddFiles: (files: File[]) => void | Promise<void>;
  onRemoveAttachment: (id: string) => void;
  processing: boolean;
  streaming: boolean;
  online: boolean;
  error: string | null;
  onDismissError: () => void;
  placeholder: string;
}

const ACCEPTED_FILES =
  'image/png,image/jpeg,image/webp,application/pdf,.pdf';

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  attachments,
  onAddFiles,
  onRemoveAttachment,
  processing,
  streaming,
  online,
  error,
  onDismissError,
  placeholder,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [value]);

  const canSend =
    online &&
    !processing &&
    !streaming &&
    (value.trim().length > 0 || attachments.length > 0);

  const send = () => {
    if (canSend) onSend();
  };

  const pickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    void onAddFiles(Array.from(files));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    if (streaming || processing) return;
    pickFiles(event.dataTransfer.files);
  };

  const showCount = value.length > 8_000;

  return (
    <div
      className={dragging ? 'composerWrap isDragging' : 'composerWrap'}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepthRef.current -= 1;
        if (dragDepthRef.current <= 0) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      {dragging ? (
        <div className="dropOverlay" aria-hidden="true">
          <Icon name="paperclip" size={22} />
          Soltá el archivo para adjuntarlo
        </div>
      ) : null}

      {error ? (
        <div className="inlineError" role="alert">
          <Icon name="alert" size={17} />
          <span>{error}</span>
          <button
            type="button"
            className="inlineErrorClose"
            aria-label="Cerrar aviso"
            onClick={onDismissError}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ) : null}

      <div className="composerPanel">
        {attachments.length || processing ? (
          <div className="attachmentRow" aria-label="Archivos adjuntos">
            {attachments.map((attachment) => (
              <div className="attachmentChip" key={attachment.id}>
                {attachment.kind === 'image' && attachment.dataUrl ? (
                  <img
                    src={attachment.dataUrl}
                    alt=""
                    className="attachmentThumb"
                  />
                ) : (
                  <span className="attachmentFileIcon" aria-hidden="true">
                    <Icon name="file" size={16} />
                  </span>
                )}
                <span className="attachmentInfo">
                  <span className="attachmentName" title={attachment.name}>
                    {attachment.name}
                  </span>
                  <span className="attachmentSize">
                    {formatBytes(attachment.size)}
                  </span>
                </span>
                <button
                  type="button"
                  className="attachmentRemove"
                  aria-label={`Quitar ${attachment.name}`}
                  onClick={() => onRemoveAttachment(attachment.id)}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
            {processing ? (
              <div className="attachmentProcessing" role="status">
                <span className="spinner small" aria-hidden="true" />
                Procesando…
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="composerInputRow">
          <input
            ref={fileInputRef}
            type="file"
            className="srOnly"
            accept={ACCEPTED_FILES}
            multiple
            tabIndex={-1}
            aria-label="Seleccionar archivo para adjuntar"
            onChange={(event) => {
              pickFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            className="composerTool"
            aria-label="Adjuntar imagen o PDF"
            title="Adjuntar imagen o PDF"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing || streaming}
          >
            <Icon name="paperclip" size={20} />
          </button>

          <textarea
            ref={textareaRef}
            className="composerTextarea"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (!streaming) send();
              }
            }}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files);
              if (files.length) {
                event.preventDefault();
                void onAddFiles(files);
              }
            }}
            rows={1}
            maxLength={LIMITS.maxTextPerMessage}
            placeholder={placeholder}
            aria-label="Mensaje para Cope"
            aria-describedby="composer-help"
          />

          {streaming ? (
            <button
              type="button"
              className="sendButton stopButton"
              aria-label="Detener respuesta"
              title="Detener respuesta"
              onClick={onStop}
            >
              <Icon name="stop" size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="sendButton"
              aria-label="Enviar mensaje"
              title={online ? 'Enviar mensaje' : 'Sin conexión'}
              onClick={send}
              disabled={!canSend}
            >
              <Icon name="arrowUp" size={20} />
            </button>
          )}
        </div>

        <div className="composerMeta" id="composer-help">
          <span>
            {!online
              ? 'Sin conexión. El historial sigue disponible.'
              : 'Cope puede equivocarse. Verificá lo importante.'}
          </span>
          <span className="composerMetaRight">
            {showCount ? (
              <span className="charCount">
                {value.length.toLocaleString('es')} /{' '}
                {LIMITS.maxTextPerMessage.toLocaleString('es')}
              </span>
            ) : null}
            <span className="keyboardHint">Enter envía · Shift+Enter salto</span>
          </span>
        </div>
      </div>
    </div>
  );
}
