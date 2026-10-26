import { useId, useState } from 'react';
import { LIMITS } from '../../../shared/limits';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type Level,
  type Subject,
  type TutorConfig,
} from '../../../shared/types';
import { Icon, type IconName } from '../../components/Icon';

const SUBJECT_ICONS: Record<Subject, IconName> = {
  math: 'calculator',
  physics: 'atom',
  chemistry: 'flask',
  general: 'book',
};

const SUBJECTS: Subject[] = ['math', 'physics', 'chemistry', 'general'];
const LEVELS: Level[] = ['primaria', 'secundaria', 'bachillerato', 'universidad'];

interface TutorPanelProps {
  tutor: TutorConfig;
  onChange: (partial: Partial<TutorConfig>) => void;
  onPractice: (topic?: string) => void;
  practiceLoading: boolean;
  disabled?: boolean;
}

export function TutorPanel({
  tutor,
  onChange,
  onPractice,
  practiceLoading,
  disabled = false,
}: TutorPanelProps) {
  const titleId = useId();
  const levelId = useId();
  const topicId = useId();
  const [topic, setTopic] = useState('');

  return (
    <section className="tutorPanel" aria-labelledby={titleId}>
      <div className="tutorPanelIntro">
        <p className="eyebrow">Contexto del tutor</p>
        <h2 id={titleId}>¿Cómo querés aprender?</h2>
        <p>
          Elegí materia y nivel. Cope adapta el vocabulario, el ritmo y los
          ejemplos a tu punto de partida.
        </p>
      </div>

      <div className="fieldGroup">
        <span className="fieldLabel">Materia</span>
        <div className="subjectGrid">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              type="button"
              className={
                tutor.subject === subject
                  ? 'subjectChip isActive'
                  : 'subjectChip'
              }
              aria-pressed={tutor.subject === subject}
              onClick={() => onChange({ subject })}
              disabled={disabled}
            >
              <Icon name={SUBJECT_ICONS[subject]} size={17} />
              {SUBJECT_LABELS[subject]}
            </button>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor={levelId}>
          Nivel
        </label>
        <div className="selectWrap">
          <select
            id={levelId}
            className="selectInput"
            value={tutor.level}
            onChange={(event) =>
              onChange({ level: event.target.value as Level })
            }
            disabled={disabled}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="selectChevron" />
        </div>
      </div>

      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor={topicId}>
          Tema <span className="fieldOptional">(opcional)</span>
        </label>
        <input
          id={topicId}
          className="textInput"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          maxLength={LIMITS.maxTopicChars}
          placeholder="Ej.: factorización, ley de Ohm…"
          disabled={disabled}
        />
      </div>

      <button
        type="button"
        className="button primary practiceButton"
        onClick={() => onPractice(topic.trim() || undefined)}
        disabled={disabled || practiceLoading}
      >
        {practiceLoading ? (
          <>
            <span className="spinner small" aria-hidden="true" />
            Generando práctica…
          </>
        ) : (
          <>
            <Icon name="sparkles" size={17} />
            Generar práctica
          </>
        )}
      </button>

      <p className="tutorNote">
        <Icon name="info" size={15} />
        La práctica tiene 5 preguntas y explicaciones. No se guarda al recargar.
      </p>
    </section>
  );
}
