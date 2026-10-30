import {
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { AiProvider } from '../lib/api';
import type { GenerationStatus } from '../lib/generationProgress';
import type { StoredAttachment, StoredMessage } from '../lib/storage';
import { GenerationProgress } from './GenerationProgress';
import { Icon } from './Icon';
import { LazyMarkdown } from './LazyMarkdown';
import { Logo } from './Logo';

interface MessageListProps {
  conversationId: string;
  messages: StoredMessage[];
  streamingId: string | null;
  streaming: boolean;
  assistantName?: string;
  generation?: GenerationStatus | null;
  provider?: AiProvider | null;
  onRetry: () => void;
  onCopy: (text: string) => void;
  children?: ReactNode;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AttachmentGallery({
  attachments,
}: {
  attachments: StoredAttachment[];
}) {
  const images = attachments.filter(
    (attachment) => attachment.kind === 'image' && attachment.dataUrl,
  );
  const documents = attachments.filter(
    (attachment) =>
      attachment.kind === 'pdf' || attachment.kind === 'text',
  );

  return (
    <div className="messageAttachments">
      {images.length ? (
        <div className="imageGrid">
          {images.map((image) => (
            <a
              key={image.id}
              className="imageAttachment"
              href={image.dataUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir ${image.name}`}
            >
              <img
                src={image.dataUrl}
                alt={image.name}
                loading="lazy"
                decoding="async"
              />
            </a>
          ))}
        </div>
      ) : null}
      {documents.map((document) => (
        <span
          key={document.id}
          className="pdfAttachment"
          title={
            document.truncated
              ? 'El texto del archivo se truncó al límite permitido.'
              : undefined
          }
        >
          <Icon name="file" size={16} />
          <span>{document.name}</span>
          {document.truncated ? (
            <span className="pdfTruncated">texto truncado</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function MessageList({
  conversationId,
  messages,
  streamingId,
  streaming,
  assistantName = 'Cope',
  generation = null,
  provider = null,
  onRetry,
  onCopy,
  children,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottomRef.current = distance < 140;
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottomRef.current = true;
    element.scrollTop = element.scrollHeight;
  }, [conversationId]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'user' || stickToBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, streamingId]);

  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  return (
    <>
      <div className="srOnly" aria-live="polite" aria-atomic="true">
        {streaming
          ? 'Cope está respondiendo.'
          : lastAssistant
            ? 'Respuesta lista.'
            : ''}
      </div>
      <div
        className="messageScroll"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="messageList" aria-busy={streaming}>
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            const isStreamingThis = message.id === streamingId;

            if (message.role === 'user') {
              return (
                <article
                  className="messageRow userRow"
                  key={message.id}
                  aria-label="Tu mensaje"
                >
                  <div className="userMeta">
                    <span>Vos</span>
                    <time dateTime={new Date(message.createdAt).toISOString()}>
                      {formatTime(message.createdAt)}
                    </time>
                  </div>
                  <div className="userBubble">
                    {message.attachments?.length ? (
                      <AttachmentGallery attachments={message.attachments} />
                    ) : null}
                    <p className="userText">{message.content}</p>
                  </div>
                </article>
              );
            }

            return (
              <article
                className="messageRow assistantRow"
                key={message.id}
                aria-label={`Respuesta de ${assistantName}`}
              >
                <div className="assistantAvatar" aria-hidden="true">
                  <Logo size={30} />
                </div>
                <div className="assistantBody">
                  <div className="assistantMeta">
                    <span className="assistantName">{assistantName}</span>
                    {message.demo ? (
                      <span className="chip demoChip">Demo</span>
                    ) : null}
                    <time dateTime={new Date(message.createdAt).toISOString()}>
                      {formatTime(message.createdAt)}
                    </time>
                    {isStreamingThis ? (
                      <span className="typingLabel">
                        <span className="typingDot" aria-hidden="true" />
                        {generation?.firstTokenAt ? 'Escribiendo…' : 'Preparando…'}
                      </span>
                    ) : null}
                  </div>

                  {isStreamingThis ? (
                    <GenerationProgress
                      generation={generation}
                      provider={provider}
                    />
                  ) : null}

                  {message.error ? (
                    <div className="messageError" role="alert">
                      <span className="messageErrorIcon" aria-hidden="true">
                        <Icon name="alert" size={18} />
                      </span>
                      <div className="messageErrorCopy">
                        <strong>No se pudo completar la respuesta</strong>
                        <p>{message.content}</p>
                        {isLast && !streaming ? (
                          <button
                            type="button"
                            className="textButton"
                            onClick={onRetry}
                          >
                            <Icon name="refresh" size={15} />
                            Reintentar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : message.content ? (
                    <LazyMarkdown content={message.content} />
                  ) : generation ? null : (
                    <div
                      className="typingIndicator"
                      role="status"
                      aria-label="Cope está escribiendo"
                    >
                      <span />
                      <span />
                      <span />
                    </div>
                  )}

                  {message.incomplete ? (
                    <div className="stoppedNote">
                      <span>La respuesta se cortó antes de terminar.</span>
                      {isLast && !streaming ? (
                        <button
                          type="button"
                          className="textButton"
                          onClick={onRetry}
                        >
                          <Icon name="refresh" size={15} />
                          Reintentar
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {message.stopped ? (
                    <div className="stoppedNote">
                      <span>Respuesta detenida.</span>
                      {isLast && !streaming ? (
                        <button
                          type="button"
                          className="textButton"
                          onClick={onRetry}
                        >
                          <Icon name="refresh" size={15} />
                          Reintentar
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {!message.error &&
                  message.content &&
                  !isStreamingThis ? (
                    <div className="messageActions">
                      <button
                        type="button"
                        className="messageAction"
                        onClick={() => onCopy(message.content)}
                      >
                        <Icon name="copy" size={14} />
                        Copiar
                      </button>
                      {isLast && !streaming ? (
                        <button
                          type="button"
                          className="messageAction"
                          onClick={onRetry}
                        >
                          <Icon name="refresh" size={14} />
                          Regenerar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
          {children}
        </div>
      </div>
    </>
  );
}
