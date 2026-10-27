import { useEffect, useState } from 'react';
import { personalityConfigSchema } from '../../shared/schemas/personality';
import {
  DEFAULT_PERSONALITY,
  PERSONALITY_DESCRIPTIONS,
  PERSONALITY_LABELS,
  type PersonalityConfig,
  type PersonalityPreset,
} from '../../shared/types';
import { Icon } from './Icon';

const PRESETS: PersonalityPreset[] = [
  'cope',
  'examinador',
  'cercano',
  'exigente',
];

interface PersonalitySettingsProps {
  personality: PersonalityConfig;
  onChange: (personality: PersonalityConfig) => void;
}

export function PersonalitySettings({
  personality,
  onChange,
}: PersonalitySettingsProps) {
  const [draft, setDraft] = useState(personality);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(personality);
  }, [personality]);

  const update = (partial: Partial<PersonalityConfig>) => {
    setDraft((previous) => ({ ...previous, ...partial }));
    setSaved(false);
    setError(null);
  };

  const save = () => {
    const parsed = personalityConfigSchema.safeParse({
      ...draft,
      name: draft.name.trim(),
      instructions: draft.instructions?.trim() ?? '',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá la personalidad.');
      return;
    }
    onChange(parsed.data);
    setDraft(parsed.data);
    setError(null);
    setSaved(true);
  };

  const reset = () => {
    const next = { ...DEFAULT_PERSONALITY };
    setDraft(next);
    onChange(next);
    setError(null);
    setSaved(true);
  };

  return (
    <div className="personalitySettings">
      <div className="fieldGroup">
        <span className="fieldLabel" id="personality-preset-label">
          Estilo
        </span>
        <div
          className="personalityPresets"
          role="radiogroup"
          aria-labelledby="personality-preset-label"
        >
          {PRESETS.map((preset) => (
            <label
              key={preset}
              className={
                draft.preset === preset
                  ? 'personalityPreset isActive'
                  : 'personalityPreset'
              }
            >
              <input
                type="radio"
                name="personality-preset"
                value={preset}
                checked={draft.preset === preset}
                onChange={() => update({ preset })}
              />
              <span className="personalityPresetCopy">
                <strong>{PERSONALITY_LABELS[preset]}</strong>
                <small>{PERSONALITY_DESCRIPTIONS[preset]}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor="personality-name">
          Nombre
        </label>
        <input
          id="personality-name"
          className="textInput"
          value={draft.name}
          maxLength={24}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="Ej.: Profe Ana"
        />
      </div>

      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor="personality-instructions">
          Instrucciones <span className="fieldOptional">(opcional)</span>
        </label>
        <textarea
          id="personality-instructions"
          className="textInput textArea personalityInstructions"
          value={draft.instructions ?? ''}
          maxLength={600}
          rows={3}
          onChange={(event) =>
            update({ instructions: event.target.value || undefined })
          }
          placeholder="Ej.: explicá con ejemplos cotidianos y hacé una pregunta al final."
        />
        <span className="fieldHint">
          {(draft.instructions?.length ?? 0).toLocaleString('es')} / 600
        </span>
      </div>

      {error ? (
        <p className="inlineError" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="personalityActions">
        <button
          type="button"
          className="button secondary small"
          onClick={() => void reset()}
        >
          <Icon name="refresh" size={15} />
          Restablecer
        </button>
        <button
          type="button"
          className="button primary small"
          onClick={save}
        >
          <Icon name={saved ? 'check' : 'sparkles'} size={15} />
          {saved ? 'Guardado' : 'Guardar personalidad'}
        </button>
      </div>
    </div>
  );
}
