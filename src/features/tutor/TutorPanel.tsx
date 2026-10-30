import { useId, useState } from 'react';
import { LIMITS } from '../../../shared/limits';
import { SUBJECTS } from '../../../shared/schemas/common';
import {
  DIFFICULTY_LABELS,
  LEVEL_LABELS,
  STUDY_STYLE_LABELS,
  SUBJECT_LABELS,
  type Difficulty,
  type Level,
  type StudyStyle,
  type Subject,
  type TutorConfig,
} from '../../../shared/types';
import { Icon, type IconName } from '../../components/Icon';
import type { PracticeSettings } from '../study/practice';
import {
  EXAM_FORMATS,
  EXAM_FORMAT_LABELS,
  EXAM_FORMAT_NOTES,
  suggestedExamFormat,
  type ExamFormat,
} from '../../../shared/exams';
import { loadCurriculumCountry } from '../../lib/curriculum';

const SUBJECT_ICONS: Record<Subject, IconName> = {
  math: 'calculator',
  physics: 'atom',
  chemistry: 'flask',
  biology: 'atom',
  spanish: 'book',
  english: 'book',
  german: 'book',
  french: 'book',
  history: 'book',
  geography: 'target',
  economics: 'chart',
  computerScience: 'calculator',
  philosophy: 'sparkles',
  psychology: 'chat',
  general: 'book',
};
const LEVELS: Level[] = ['primaria', 'secundaria', 'bachillerato', 'universidad'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const STYLES: StudyStyle[] = ['guided', 'solver'];

interface TutorPanelProps {
  tutor: TutorConfig;
  onChange: (partial: Partial<TutorConfig>) => void;
  online: boolean;
  onPractice: (settings: PracticeSettings) => void;
  latestMaterial?: string;
  practiceLoading: boolean;
  disabled?: boolean;
  onOpenFlashcards: () => void;
  onOpenPlan: () => void;
  onOpenOralExam: () => void;
  onOpenPodcast: () => void;
  onOpenProgress: () => void;
}

export function TutorPanel({
  tutor,
  onChange,
  online,
  onPractice,
  latestMaterial,
  practiceLoading,
  disabled = false,
  onOpenFlashcards,
  onOpenPlan,
  onOpenOralExam,
  onOpenPodcast,
  onOpenProgress,
}: TutorPanelProps) {
  const titleId = useId();
  const levelId = useId();
  const difficultyId = useId();
  const topicId = useId();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState<5 | 10>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timed, setTimed] = useState(false);
  const [useMaterial, setUseMaterial] = useState(false);
  const countryFormat = suggestedExamFormat(loadCurriculumCountry());
  const [examFormat, setExamFormat] = useState<ExamFormat>(countryFormat);
  const examFormatId = useId();

  const practiceDisabled = disabled || practiceLoading || !online;

  return (
    <section className="tutorPanel" aria-labelledby={titleId}>
      <div className="tutorPanelIntro">
        <p className="eyebrow">Estudio</p>
        <h2 id={titleId}>¿Cómo querés aprender?</h2>
        <p>
          Elegí materia, nivel y estilo. Cope adapta el vocabulario, el ritmo y
          los ejemplos a tu punto de partida.
        </p>
      </div>

      <div className="fieldGroup">
        <span className="fieldLabel">Estilo</span>
        <div
          className="studyStyleSwitch"
          role="group"
          aria-label="Estilo del tutor"
        >
          {STYLES.map((style) => (
            <button
              key={style}
              type="button"
              className={
                tutor.style === style
                  ? 'studyStyleOption isActive'
                  : 'studyStyleOption'
              }
              aria-pressed={tutor.style === style}
              onClick={() => onChange({ style })}
              disabled={disabled}
            >
              {STUDY_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
        <p className="fieldHint">
          {tutor.style === 'guided'
            ? 'Pistas y preguntas para que resuelvas vos.'
            : 'Resolución completa, paso a paso y comprobación.'}
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

      <div className="studySettings" aria-label="Configuración de práctica">
        <div className="fieldGroup">
          <span className="fieldLabel">Preguntas</span>
          <div
            className="countSwitch"
            role="group"
            aria-label="Cantidad de preguntas"
          >
            {([5, 10] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={
                  count === value ? 'countOption isActive' : 'countOption'
                }
                aria-pressed={count === value}
                onClick={() => setCount(value)}
                disabled={disabled}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="fieldGroup">
          <label className="fieldLabel" htmlFor={difficultyId}>
            Dificultad
          </label>
          <div className="selectWrap">
            <select
              id={difficultyId}
              className="selectInput"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as Difficulty)
              }
              disabled={disabled}
            >
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {DIFFICULTY_LABELS[value]}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={16} className="selectChevron" />
          </div>
        </div>
      </div>

      <div className="fieldGroup">
        <label className="fieldLabel" htmlFor={examFormatId}>
          Formato de examen
        </label>
        <div className="selectWrap">
          <select
            id={examFormatId}
            className="selectInput"
            value={examFormat}
            onChange={(event) =>
              setExamFormat(event.target.value as ExamFormat)
            }
            disabled={disabled}
          >
            {EXAM_FORMATS.map((value) => (
              <option key={value} value={value}>
                {EXAM_FORMAT_LABELS[value]}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="selectChevron" />
        </div>
        {countryFormat !== 'general' ? (
          <span className="fieldHint">
            Sugerido para tu país: {EXAM_FORMAT_LABELS[countryFormat]}.
          </span>
        ) : null}
        {examFormat !== 'general' ? (
          <span className="fieldHint">{EXAM_FORMAT_NOTES[examFormat]}</span>
        ) : null}
      </div>

      <label className="switchRow">
        <span>
          <span className="fieldLabel">Con tiempo</span>
          <span className="fieldHint">
            {count} minutos para toda la práctica
          </span>
        </span>
        <input
          type="checkbox"
          className="switchInput"
          checked={timed}
          onChange={(event) => setTimed(event.target.checked)}
          disabled={disabled}
        />
        <span className="switchVisual" aria-hidden="true" />
      </label>

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

      {latestMaterial ? (
        <label className="switchRow">
          <span>
            <span className="fieldLabel">Usar el último material</span>
            <span className="fieldHint">
              PDF, TXT o subtítulos de esta conversación
            </span>
          </span>
          <input
            type="checkbox"
            className="switchInput"
            checked={useMaterial}
            onChange={(event) => setUseMaterial(event.target.checked)}
            disabled={disabled}
          />
          <span className="switchVisual" aria-hidden="true" />
        </label>
      ) : null}

      <button
        type="button"
        className="button primary practiceButton"
        onClick={() =>
          onPractice({
            count,
            difficulty,
            timed,
            examFormat,
            topic: topic.trim() || undefined,
            ...(useMaterial && latestMaterial
              ? { sourceText: latestMaterial }
              : {}),
          })
        }
        disabled={practiceDisabled}
      >
        {practiceLoading ? (
          <>
            <span className="spinner small" aria-hidden="true" />
            Generando práctica…
          </>
        ) : (
          <>
            <Icon name="target" size={17} />
            Practicar
          </>
        )}
      </button>

      {!online ? (
        <p className="fieldHint">
          Sin conexión: podés ver progreso, flashcards y planes guardados.
        </p>
      ) : null}

      <div className="studyTools" aria-label="Herramientas de estudio">
        <button
          type="button"
          className="studyTool"
          onClick={onOpenFlashcards}
        >
          <Icon name="cards" size={18} />
          <span>Flashcards</span>
        </button>
        <button type="button" className="studyTool" onClick={onOpenPlan}>
          <Icon name="calendar" size={18} />
          <span>Plan de examen</span>
        </button>
        <button type="button" className="studyTool" onClick={onOpenOralExam}>
          <Icon name="mic" size={18} />
          <span>Examen oral</span>
        </button>
        <button type="button" className="studyTool" onClick={onOpenPodcast}>
          <Icon name="volume" size={18} />
          <span>Podcast</span>
        </button>
        <button type="button" className="studyTool" onClick={onOpenProgress}>
          <Icon name="chart" size={18} />
          <span>Progreso</span>
        </button>
      </div>

      <p className="tutorNote">
        <Icon name="info" size={15} />
        La práctica, las tarjetas y los planes se guardan en este dispositivo.
      </p>
    </section>
  );
}
