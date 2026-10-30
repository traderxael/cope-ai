import { useEffect, useState } from 'react';
import {
  CURRICULUM_COUNTRIES,
  CURRICULUM_COUNTRY_LABELS,
  CURRICULUM_COUNTRY_PROFILES,
  CURRICULUM_OFFICIAL_SOURCES,
  type CurriculumCountry,
} from '../../shared/curriculum';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type PersonalityConfig,
} from '../../shared/types';
import type { AiProvider, VoiceCapabilities } from '../lib/api';
import { formatBytes } from '../lib/attachments';
import { downloadBackup } from '../lib/backup';
import {
  loadCurriculumCountry,
  saveCurriculumCountry,
} from '../lib/curriculum';
import {
  LEARNING_GOAL_LABELS,
  type LearningGoal,
  type UserProfile,
} from '../lib/profile';
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
  onGoalChange?: (goal: LearningGoal) => void;
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
  onGoalChange,
  onClearAll,
}: SettingsDialogProps) {
  const [storage, setStorage] = useState<{
    usage: number;
    quota: number;
  } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [backupState, setBackupState] = useState<
    'idle' | 'working' | 'done' | 'error'
  >('idle');
  const [country, setCountry] =
    useState<CurriculumCountry>(loadCurriculumCountry);

  useEffect(() => {
    if (open) setCountry(loadCurriculumCountry());
  }, [open]);

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

  const saveBackup = async () => {
    setBackupState('working');
    try {
      await downloadBackup();
      setBackupState('done');
    } catch {
      setBackupState('error');
    }
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
        <h3>Currículo</h3>
        <label className="fieldLabel" htmlFor="settings-country">
          País de referencia
        </label>
        <div className="selectWrap">
          <select
            id="settings-country"
            className="selectInput"
            value={country}
            onChange={(event) => {
              setCountry(
                saveCurriculumCountry(
                  event.target.value as CurriculumCountry,
                ),
              );
            }}
          >
            {CURRICULUM_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {CURRICULUM_COUNTRY_LABELS[code]}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="selectChevron" />
        </div>
        <p className="settingsHint">
          Ajusta ejemplos y terminología de la IA al país, incluida la práctica,
          las flashcards, el plan y el examen oral. “General” no aplica un
          currículo específico.
        </p>
        {country !== 'general' ? (
          <>
            <p className="settingsHint">
              Examen de referencia: {CURRICULUM_COUNTRY_PROFILES[country].exam}.
              Es una referencia general, no contenido oficial.
            </p>
            <p className="settingsHint">
              <a
                className="settingsExternalLink"
                href={CURRICULUM_OFFICIAL_SOURCES[country].url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Sitio oficial: {CURRICULUM_OFFICIAL_SOURCES[country].label}
              </a>{' '}
              · No alojamos exámenes; adjuntá el PDF y practicá desde el material.
            </p>
          </>
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
            <label className="fieldLabel" htmlFor="settings-goal">
              Objetivo
            </label>
            <div className="selectWrap">
              <select
                id="settings-goal"
                className="selectInput"
                value={profile.goal ?? 'exam'}
                onChange={(event) =>
                  onGoalChange?.(event.target.value as LearningGoal)
                }
              >
                {(['exam', 'grades', 'practice'] as LearningGoal[]).map(
                  (goal) => (
                    <option key={goal} value={goal}>
                      {LEARNING_GOAL_LABELS[goal]}
                    </option>
                  ),
                )}
              </select>
              <Icon name="chevronDown" size={16} className="selectChevron" />
            </div>
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

      <div className="settingsSection">
        <h3>Respaldo</h3>
        <p className="settingsHint">
          Descargá un archivo JSON con tus conversaciones, prácticas, mazos,
          planes y exámenes orales. Tus datos siguen guardados en este
          dispositivo.
        </p>
        <button
          type="button"
          className="button ghost small"
          onClick={() => void saveBackup()}
          disabled={backupState === 'working'}
        >
          <Icon name="download" size={16} />
          {backupState === 'working'
            ? 'Preparando…'
            : 'Descargar respaldo'}
        </button>
        {backupState === 'done' ? (
          <p className="settingsHint" role="status">
            Respaldo descargado.
          </p>
        ) : null}
        {backupState === 'error' ? (
          <p className="settingsHint" role="alert">
            No se pudo generar el respaldo.
          </p>
        ) : null}
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
