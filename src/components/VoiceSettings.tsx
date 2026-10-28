import { useEffect, useState } from 'react';
import { LIMITS } from '../../shared/limits';
import type { VoiceCapabilities } from '../lib/api';
import { cloneVoice, deleteVoice } from '../lib/api';
import { ApiError } from '../lib/api';
import {
  loadOwnerCode,
  loadVoiceSettings,
  saveOwnerCode,
  saveVoiceSettings,
  type VoiceMode,
  type VoiceSettings as VoiceSettingsValue,
} from '../lib/voice';
import {
  VOICE_PROFILE_LABELS,
  type VoiceProfile,
} from '../lib/speech/tts';
import { Icon } from './Icon';

interface VoiceSettingsProps {
  capabilities: VoiceCapabilities;
  active?: boolean;
}

function validateMp3(file: File): string | null {
  const isMp3 =
    file.type === 'audio/mpeg' ||
    file.type === 'audio/mp3' ||
    file.name.toLowerCase().endsWith('.mp3');
  if (!isMp3) return 'La muestra debe ser un archivo MP3.';
  if (file.size > LIMITS.maxVoiceSampleBytes) {
    return 'La muestra supera los 5 MB.';
  }
  return null;
}

function audioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanup();
      if (Number.isFinite(duration)) resolve(duration);
      else reject(new Error('No se pudo leer la duración del MP3.'));
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('No se pudo leer el MP3.'));
    };
  });
}

export function VoiceSettings({
  capabilities,
  active = true,
}: VoiceSettingsProps) {
  const [settings, setSettings] = useState<VoiceSettingsValue>(loadVoiceSettings);
  const [ownerCode, setOwnerCode] = useState(loadOwnerCode);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setSettings(loadVoiceSettings());
    setOwnerCode(loadOwnerCode());
  }, [active]);

  const update = (next: VoiceSettingsValue) => {
    setSettings(saveVoiceSettings(next));
    setMessage(null);
  };

  const updateCode = (code: string) => {
    setOwnerCode(code);
    saveOwnerCode(code);
    setMessage(null);
  };

  const setMode = (mode: VoiceMode) => {
    update({ ...settings, mode });
  };

  const clone = async () => {
    if (!file || !consent || !ownerCode.trim() || busy) return;
    const validation = validateMp3(file);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const duration = await audioDuration(file);
      if (duration < 30 || duration > 180) {
        throw new Error('La muestra debe durar entre 30 segundos y 3 minutos.');
      }
      const voiceId = await cloneVoice(file, ownerCode.trim());
      update({
        ...settings,
        mode: 'cloned',
        clonedVoiceId: voiceId,
        clonedLabel: 'Mi voz',
      });
      setMessage(
        'Voz clonada. La muestra no se guardó en este dispositivo ni en el servidor.',
      );
      setFile(null);
      setConsent(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : 'No se pudo clonar la voz.',
      );
    } finally {
      setBusy(false);
    }
  };

  const removeVoice = async () => {
    if (!settings.clonedVoiceId || !ownerCode.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteVoice(settings.clonedVoiceId, ownerCode.trim());
      update({
        ...settings,
        mode: 'browser',
        clonedVoiceId: undefined,
        clonedLabel: undefined,
      });
      setMessage('Voz clonada eliminada.');
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : 'No se pudo eliminar la voz.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="voiceSettings">
      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor="voice-profile">
          Voz del navegador
        </label>
        <div className="selectWrap">
          <select
            id="voice-profile"
            className="selectInput"
            value={settings.profile}
            onChange={(event) =>
              update({
                ...settings,
                profile: event.target.value as VoiceProfile,
              })
            }
          >
            {Object.entries(VOICE_PROFILE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="selectChevron" />
        </div>
        <span className="fieldHint">
          Gratis y siempre disponible como respaldo.
        </span>
      </div>

      {capabilities.tts ? (
        <>
          <div className="fieldGroup">
            <label className="fieldLabel" htmlFor="voice-owner-code">
              Código de propietario
            </label>
            <input
              id="voice-owner-code"
              type="password"
              className="textInput"
              value={ownerCode}
              onChange={(event) => updateCode(event.target.value)}
              placeholder="Solo para esta sesión"
              autoComplete="off"
            />
            <span className="fieldHint">
              Se guarda en sessionStorage y protege tu clave de voz.
            </span>
          </div>

          <div className="fieldGroup">
            <span className="fieldLabel">Voz de la IA</span>
            <div className="voiceModes" role="radiogroup" aria-label="Voz de la IA">
              <label className={settings.mode === 'browser' ? 'voiceMode isActive' : 'voiceMode'}>
                <input
                  type="radio"
                  name="voice-mode"
                  value="browser"
                  checked={settings.mode === 'browser'}
                  onChange={() => setMode('browser')}
                />
                Navegador (gratis)
              </label>
              <label className={settings.mode === 'external' ? 'voiceMode isActive' : 'voiceMode'}>
                <input
                  type="radio"
                  name="voice-mode"
                  value="external"
                  checked={settings.mode === 'external'}
                  onChange={() => setMode('external')}
                  disabled={!ownerCode.trim()}
                />
                Voz ElevenLabs
              </label>
              {settings.clonedVoiceId ? (
                <label className={settings.mode === 'cloned' ? 'voiceMode isActive' : 'voiceMode'}>
                  <input
                    type="radio"
                    name="voice-mode"
                    value="cloned"
                    checked={settings.mode === 'cloned'}
                    onChange={() => setMode('cloned')}
                    disabled={!ownerCode.trim()}
                  />
                  {settings.clonedLabel ?? 'Mi voz clonada'}
                </label>
              ) : null}
            </div>
            {settings.mode !== 'browser' && !ownerCode.trim() ? (
              <span className="fieldHint isWarning">
                Guardá el código para usar una voz externa.
              </span>
            ) : null}
          </div>

          {capabilities.clone ? (
            <div className="voiceCloneBox">
              <div>
                <strong>Clonar mi voz</strong>
                <p>
                  Subí un MP3 de 30 s a 3 min. Se envía a ElevenLabs para crear
                  una voz; no se guarda en Cope AI.
                </p>
              </div>
              <input
                type="file"
                accept="audio/mpeg,.mp3"
                className="voiceFileInput"
                aria-label="Muestra MP3 para clonar mi voz"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setConsent(false);
                  setError(null);
                  setMessage(null);
                }}
                disabled={busy}
              />
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  disabled={busy}
                />
                <span>
                  Tengo permiso y entiendo que mi voz es un dato biométrico que
                  se enviará a ElevenLabs.
                </span>
              </label>
              <div className="personalityActions">
                {settings.clonedVoiceId ? (
                  <button
                    type="button"
                    className="button ghost small"
                    onClick={() => void removeVoice()}
                    disabled={busy || !ownerCode.trim()}
                  >
                    <Icon name="trash" size={15} />
                    Eliminar mi voz
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => void clone()}
                  disabled={busy || !file || !consent || !ownerCode.trim()}
                >
                  {busy ? (
                    <>
                      <span className="spinner small" aria-hidden="true" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      <Icon name="mic" size={15} />
                      Clonar mi voz
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="fieldHint">
          La voz externa no está configurada en el servidor. El examen oral usa
          la voz del navegador.
        </p>
      )}
      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor="voice-rate">
          Rate (%)
        </label>
        <div className="inputWrap">
          <input
            id="voice-rate"
            type="range"
            min="-50"
            max="50"
            value={settings.rate ?? 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              update({ ...settings, rate: val });
            }}
          />
          <span className="sliderValue">{settings.rate ?? 0}%</span>
        </div>
        <span className="fieldHint">
          Velocidad relativa al habla normal.
        </span>
      </div>
      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor="voice-pitch">
          Pitch (semitonos)
        </label>
        <div className="inputWrap">
          <input
            id="voice-pitch"
            type="range"
            min="-20"
            max="20"
            value={settings.pitch ?? 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              update({ ...settings, pitch: val });
            }}
          />
          <span className="sliderValue">{settings.pitch ?? 0}</span>
        </div>
        <span className="fieldHint">
          Ajuste de tono relativo al voz base.
        </span>
      </div>

      {error ? (
        <p className="inlineError" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </p>
      ) : null}
      {message ? (
        <p className="inlineSuccess" role="status">
          <Icon name="check" size={16} />
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
