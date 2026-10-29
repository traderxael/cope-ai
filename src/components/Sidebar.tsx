import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
} from '../../shared/types';
import type { Conversation } from '../lib/storage';
import { Icon } from './Icon';
import { Logo } from './Logo';

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  demo: boolean | null;
  provider?: 'openai' | 'ollama' | 'pollinations' | 'fixtures' | null;
  resolvedTheme: 'light' | 'dark';
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onSettings: () => void;
  onProgress: () => void;
  onBadges: () => void;
  onFocus: () => void;
  onToggleTheme: () => void;
  onClose?: () => void;
}

function relativeDate(timestamp: number): string {
  const now = Date.now();
  const difference = Math.max(0, now - timestamp);
  if (difference < 60_000) return 'Ahora';
  if (difference < 3_600_000) {
    const minutes = Math.max(1, Math.floor(difference / 60_000));
    return `Hace ${minutes} min`;
  }
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function Sidebar({
  conversations,
  activeId,
  demo,
  provider,
  resolvedTheme,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onSettings,
  onProgress,
  onBadges,
  onFocus,
  onToggleTheme,
  onClose,
}: SidebarProps) {
  return (
    <div className="sidebarInner">
      <div className="sidebarBrandRow">
        <Logo withWordmark size={34} />
        {onClose ? (
          <button
            type="button"
            className="iconButton"
            aria-label="Cerrar conversaciones"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        ) : null}
      </div>

      <button type="button" className="newChatButton" onClick={onNew}>
        <span className="newChatIcon">
          <Icon name="plus" size={18} />
        </span>
        <span>Nueva conversación</span>
        <kbd>N</kbd>
      </button>

      <nav className="conversationNav" aria-label="Conversaciones">
        <div className="sidebarSectionLabel">
          <span>Recientes</span>
          <span>{conversations.length}</span>
        </div>

        {conversations.length === 0 ? (
          <p className="sidebarEmpty">
            Tus conversaciones van a aparecer acá. Empezá con una pregunta.
          </p>
        ) : (
          <ul className="conversationList">
            {conversations.map((conversation) => {
              const active = conversation.id === activeId;
              const tutorLabel =
                conversation.mode === 'tutor'
                  ? `${SUBJECT_LABELS[conversation.tutor.subject]} · ${LEVEL_LABELS[conversation.tutor.level]}`
                  : 'Asistente';
              return (
                <li
                  key={conversation.id}
                  className={
                    active
                      ? 'conversationItem isActive'
                      : 'conversationItem'
                  }
                >
                  <button
                    type="button"
                    className="conversationMain"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="conversationIcon" aria-hidden="true">
                      <Icon
                        name={
                          conversation.mode === 'tutor' ? 'graduation' : 'chat'
                        }
                        size={16}
                      />
                    </span>
                    <span className="conversationCopy">
                      <span className="conversationTitle">
                        {conversation.title}
                      </span>
                      <span className="conversationMeta">
                        {tutorLabel}
                        <span aria-hidden="true"> · </span>
                        <time dateTime={new Date(conversation.updatedAt).toISOString()}>
                          {relativeDate(conversation.updatedAt)}
                        </time>
                      </span>
                    </span>
                  </button>
                  <span className="conversationActions">
                    <button
                      type="button"
                      className="iconButton tiny"
                      aria-label={`Renombrar ${conversation.title}`}
                      onClick={() => onRename(conversation)}
                    >
                      <Icon name="pencil" size={14} />
                    </button>
                    <button
                      type="button"
                      className="iconButton tiny"
                      aria-label={`Borrar ${conversation.title}`}
                      onClick={() => onDelete(conversation)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="sidebarFooter">
        <div className="sidebarStatusRow">
          {demo === true ? (
            <div className="connectionBadge isDemo" role="status">
              <span className="statusDot" aria-hidden="true" />
              Entorno de prueba
            </div>
          ) : demo === false ? (
            <div className="connectionBadge isLive" role="status">
              <span className="statusDot" aria-hidden="true" />
              {provider === 'ollama'
                ? 'IA local'
                : provider === 'pollinations'
                  ? 'IA gratis'
                  : 'IA configurada'}
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="iconButton"
            aria-label={
              resolvedTheme === 'dark'
                ? 'Cambiar a tema claro'
                : 'Cambiar a tema oscuro'
            }
            title={
              resolvedTheme === 'dark'
                ? 'Cambiar a tema claro'
                : 'Cambiar a tema oscuro'
            }
            onClick={onToggleTheme}
          >
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </div>

        <p className="sidebarPrivacy">
          <Icon name="shield" size={14} />
          Historial guardado en este dispositivo.
        </p>

        <div className="sidebarFooterActions">
          <button
            type="button"
            className="sidebarAction"
            onClick={onProgress}
          >
            <Icon name="chart" size={17} />
            Progreso
          </button>
          <button
            type="button"
            className="sidebarAction"
            onClick={onBadges}
          >
            <Icon name="sparkles" size={17} />
            Insignias
          </button>
          <button
            type="button"
            className="sidebarAction"
            onClick={onFocus}
          >
            <Icon name="timer" size={17} />
            Enfoque
          </button>
          <button
            type="button"
            className="sidebarAction"
            onClick={onSettings}
          >
            <Icon name="settings" size={17} />
            Ajustes
          </button>
        </div>
      </div>
    </div>
  );
}
