import { useEffect, useState } from 'react';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type PersonalityConfig,
} from '../../shared/types';
import type { AiProvider, VoiceCapabilities } from '../lib/api';
import { formatBytes } from '../lib/attachments';
import type { UserProfile } from '../lib/profile';
import { storageEstimate } from '../lib/storage';
import { type Theme } from '../lib/theme';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { PersonalitySettings } from './PersonalitySettings';
import { VoiceSettings } from './VoiceSettings';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  personality: PersonalityConfig;
  onPersonalityChange: (personality: PersonalityConfig) => void;
  voice: VoiceCapabilities;
  provider?: AiProvider | null;
  demo: boolean | null;
  profile?: UserProfile | null;
  onRestartOnboarding?: () => void;
  onClearAll: () => Promise<void>;
}

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  icon: 'sun' | 'moon' | 'monitor';
}> = [
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', icon: 'moon' },
  { value: 'system', label: 'Sistema', icon: 'monitor' },
];

export function SettingsDialog({
  open,
  onClose,
  theme,
  onThemeChange,
  personality,
  onPersonalityChange,
  voice,
  provider,
  demo,
  profile,
  onRestartOnboarding,
  onClearAll,
}: SettingsDialogProps) {
  const [storage, setStorage] = useState<{
    usage: number;
    quota: number;
  } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmClear(false);
      return;
    }
    let cancelled = false;
    setStorageLoading(true);
    void storageEstimate().then((estimate) => {
      if (cancelled) return;
      setStorage(estimate);
      setStorageLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const clearHistory = async () => {
    setClearing(true);
    await onClearAll();
    setClearing(false);
    setConfirmClear(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ajustes"
      description="Preferencias y datos de este dispositivo."
    >
      <div className="settingsSection">
        <h3>Tema</h3>
        <div className="themeSwitch" role="group" aria-label="Tema de la app">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                theme === option.value
                  ? 'themeOption isActive'
                  : 'themeOption'
              }
              aria-pressed={theme === option.value}
              onClick={() => onThemeChange(option.value)}
            >
              <Icon name={option.icon} size={16} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settingsSection">
        <h3>Inteligencia artificial</h3>
        <div className="settingsRow">
          <span>Motor de IA</span>
          <span
            className={
              demo === true
                ? 'connectionBadge isDemo'
                : demo === false
                  ? 'connectionBadge isLive'
                  : 'connectionBadge'
            }
          >
            <span className="statusDot" aria-hidden="true" />
            {demo === true
              ? 'Entorno de prueba'
              : provider === 'ollama'
                ? 'Ollama local'
                : provider === 'pollinations'
                  ? 'Nube gratuita'
                  : provider === 'openai'
                    ? 'Proveedor configurado'
                    : 'Sin verificar'}
          </span>
        </div>
        <p className="settingsHint">
          Cope usa un proxy del servidor. La clave de tu proveedor nunca se
          guarda en el navegador ni se incluye en la app. La nube gratuita
          envía los mensajes a un servicio público de terceros.
        </p>
        {provider === 'ollama' ? (
          <p className="settingsHint">
            El modelo local corre en tu equipo: el primer request puede tardar
            y la calidad suele ser menor que la nube. Verificá el contenido de
            práctica y exámenes antes de estudiarlo.
          </p>
        ) : null}
      </div>

      <div className="settingsSection">
        <h3>Personalidad de la IA</h3>
        <p className="settingsHint">
          Elige cómo te acompaña en el tutor, el asistente y el examen oral.
        </p>
        <PersonalitySettings
          personality={personality}
          onChange={onPersonalityChange}
        />
      </div>

      <div className="settingsSection">
        <h3>Voz</h3>
        <p className="settingsHint">
          El examen oral puede leer las preguntas y escuchar tus respuestas.
        </p>
        <VoiceSettings capabilities={voice} active={open} />
      </div>

      <div className="settingsSection">
        <h3>Perfil local</h3>
        {profile ? (
          <>
            <div className="settingsRow">
              <span>{profile.name}</span>
              <span className="settingsValue">
                {LEVEL_LABELS[profile.level]}
              </span>
            </div>
            <p className="settingsHint">
              {profile.subjects
                .map((subject) => SUBJECT_LABELS[subject])
                .join(', ')}
            </p>
            <p className="settingsHint">
              Rehacer el onboarding no borra tu historial ni tus prácticas.
            </p>
            <button
              type="button"
              className="button ghost small"
              onClick={onRestartOnboarding}
            >
              Rehacer el onboarding
            </button>
          </>
        ) : (
          <p className="settingsHint">Todavía no hay un perfil guardado.</p>
        )}
      </div>

      <div className="settingsSection">
        <h3>Datos locales</h3>
        <div className="settingsRow">
          <span>Almacenamiento local del sitio</span>
          <span className="settingsValue">
            {storageLoading
              ? 'Calculando…'
              : storage && storage.quota > 0
                ? `${formatBytes(storage.usage)} de ${formatBytes(storage.quota)}`
                : 'No disponible'}
          </span>
        </div>
        <p className="settingsHint">
          Las conversaciones, las imágenes procesadas, el texto extraído de los
          PDF, las prácticas, las flashcards y los planes se guardan en
          IndexedDB. El PDF original no se sube desde tu dispositivo.
        </p>

        {confirmClear ? (
          <div className="dangerConfirm" role="alert">
            <p>
              ¿Borrar todas las conversaciones, prácticas, flashcards y planes
              guardados? No se puede deshacer.
            </p>
            <div className="dangerActions">
              <button
                type="button"
                className="button danger"
                onClick={() => void clearHistory()}
                disabled={clearing}
              >
                {clearing ? 'Borrando…' : 'Sí, borrar todo'}
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="button dangerOutline"
            onClick={() => setConfirmClear(true)}
          >
            <Icon name="trash" size={16} />
            Borrar todo el historial y progreso
          </button>
        )}
      </div>

      <div className="settingsSection aboutSection">
        <h3>Acerca de Cope AI</h3>
        <p>
          Versión 0.1.0 · PWA instalable. Proyecto original e independiente.
          No tiene afiliación con Astra AI ni usa su código, recursos o marca.
        </p>
        <p className="settingsHint">
          Cope puede cometer errores. Verificá la información importante.
        </p>
      </div>
    </Dialog>
  );
}
