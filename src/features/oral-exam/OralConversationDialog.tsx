import { useEffect, useRef, useState } from 'react';
import {
  DIFFICULTIES,
  LEVELS,
  SUBJECTS,
} from '../../../shared/schemas/common';
import type {
  Difficulty,
  Level,
  OralExamConfig,
  OralGradeResponse,
  PersonalityConfig,
  Subject,
  TutorConfig,
} from '../../../shared/types';
import {
  DIFFICULTY_LABELS,
  LEVEL_LABELS,
  ORAL_COUNT_OPTIONS,
  PERSONALITY_LABELS,
  SUBJECT_LABELS,
} from '../../../shared/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { ApiError, requestOralExam, requestOralGrade } from '../../lib/api';
import { curriculumCountryForRequest } from '../../lib/curriculum';
import {
  speakExternal,
  speakText,
  speechSynthesisSupported,
  stopSpeaking,
  VOICE_PROFILE_LABELS,
  type VoiceProfile,
} from '../../lib/speech/tts';
import {
  loadOwnerCode,
  loadVoiceSettings,
  saveVoiceSettings,
  type VoiceSettings as VoiceSettingsValue,
} from '../../lib/voice';
import {
  speechRecognitionSupported,
  startDictation,
  type Dictation,
} from '../../lib/speech/stt';

type View = 'setup' | 'conversation' | 'results';

interface OralConversationDialogProps {
  open: boolean;
  onClose: () => void;
  tutor: TutorConfig;
  personality: PersonalityConfig;
  voice: { tts: boolean; clone: boolean };
  online: boolean;
  onOpenSettings: () => void;
}

type Count = (typeof ORAL_COUNT_OPTIONS)[number];

let conversationStartTime = 0;

// Frases cortas de "profesor" para dar continuidad entre preguntas.
const PROFESOR_FEEDBACK: string[] = [
  'Muy bien. Continuemos.',
  'Excelente. Pasemos a la siguiente.',
  'Bien dicho. Siguiente pregunta.',
  'Buena respuesta. Veamos la siguiente.',
  'Correcto. Continuamos con la siguiente.',
];

function pickFeedback(): string {
  return PROFESOR_FEEDBACK[Math.floor(Math.random() * PROFESOR_FEEDBACK.length)];
}

function parseTopics(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((topic) => topic.trim())
        .filter(Boolean),
    ),
  ].slice(0, 6);
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function zoneClass(zone: OralGradeResponse['zone']): string {
  return `oralZone oralZone-${zone}`;
}

export function OralConversationDialog({
  open,
  onClose,
  tutor,
  personality,
  voice,
  online,
  onOpenSettings,
}: OralConversationDialogProps) {
  const [view, setView] = useState<View>('setup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] =
    useState<VoiceSettingsValue>(loadVoiceSettings);
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<
    Array<{ id: string; prompt: string }>
  >([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [conversationGrade, setConversationGrade] =
    useState<OralGradeResponse | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [profesorComment, setProfesorComment] = useState<string | null>(null);
  const [setupSubject, setSetupSubject] = useState<Subject>(tutor.subject);
  const [setupLevel, setSetupLevel] = useState<Level>(tutor.level);
  const [setupDifficulty, setSetupDifficulty] =
    useState<Difficulty>('medium');
  const [setupTopics, setSetupTopics] = useState('');
  const [setupCount, setSetupCount] = useState<Count>(5);
  const dictationRef = useRef<Dictation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const current = questions[index];

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      dictationRef.current?.abort();
      dictationRef.current = null;
      setListening(false);
      abortControllerRef.current?.abort();
      return;
    }
    setView('setup');
    setError(null);
    setVoiceError(null);
    setIndex(0);
    setQuestions([]);
    setAnswers({});
    setDraftAnswer('');
    setInterim('');
    setListening(false);
    setProfesorComment(null);
    setSetupSubject(tutor.subject);
    setSetupLevel(tutor.level);
    setSetupDifficulty('medium');
    setSetupTopics('');
    setSetupCount(5);
    setVoiceSettings(loadVoiceSettings());
    const controller = abortControllerRef.current;
    return () => {
      stopSpeaking();
      dictationRef.current?.abort();
      dictationRef.current = null;
      controller?.abort();
    };
  }, [open, tutor.subject, tutor.level]);

  useEffect(() => {
    if (view !== 'conversation') return;
    const update = () =>
      setElapsed(
        Math.max(
          0,
          Math.round(
            (Date.now() - (conversationStartTime || Date.now())) / 1000,
          ),
        ),
      );
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [view]);

  const stopDictation = () => {
    dictationRef.current?.abort();
    dictationRef.current = null;
    setListening(false);
    setInterim('');
  };

  const stopAllAudio = () => {
    stopSpeaking();
    stopDictation();
  };

  const openSetup = () => {
    stopAllAudio();
    setError(null);
    setView('setup');
  };

  const generate = async () => {
    if (!online || busy) return;
    const config: OralExamConfig = {
      subject: setupSubject,
      level: setupLevel,
      difficulty: setupDifficulty,
      country: curriculumCountryForRequest(),
      topics: parseTopics(setupTopics),
      count: setupCount,
    };
    setBusy(true);
    setError(null);
    try {
      const exam = await requestOralExam(config, personality);
      setQuestions(
        exam.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
        })),
      );
      conversationStartTime = Date.now();
      setIndex(0);
      setDraftAnswer('');
      setAnswers({});
      setInterim('');
      setProfesorComment(null);
      setView('conversation');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo iniciar la conversación. Probá de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const speakCurrentQuestion = async () => {
    if (!current) return;
    setVoiceError(null);
    const settings = loadVoiceSettings();
    const ownerCode = loadOwnerCode();
    let usedExternal = false;
    if (
      settings.mode !== 'browser' &&
      voice.tts &&
      ownerCode.trim()
    ) {
      try {
        await speakExternal(current.prompt, {
          voiceId:
            settings.mode === 'cloned' ? settings.clonedVoiceId : undefined,
          ownerCode,
        });
        usedExternal = true;
      } catch (caught) {
        setVoiceError(
          `${
            caught instanceof Error ? caught.message : 'La voz externa falló.'
          } Usando la voz del navegador.`,
        );
      }
    }
    if (!usedExternal) {
      try {
        await speakText(
          current.prompt,
          settings.profile,
          personality.language ?? 'es',
        );
      } catch (caught) {
        setVoiceError(
          caught instanceof Error
            ? caught.message
            : 'No se pudo reproducir la voz.',
        );
      }
    }
  };

  const startListening = () => {
    if (!speechRecognitionSupported()) {
      setVoiceError(
        'Este navegador no admite dictado por voz. Escribí tu respuesta.',
      );
      return;
    }
    setVoiceError(null);
    setInterim('');
    setListening(true);
    dictationRef.current = startDictation({
      onInterim: setInterim,
      onFinal: (text) => {
        setDraftAnswer((previous) =>
          `${previous}${previous.trim() ? ' ' : ''}${text.trim()}`,
        );
        setAnswers({
          ...answers,
          [current?.id ?? '']: draftAnswer
            ? `${draftAnswer} ${text.trim()}`.trim()
            : text.trim(),
        });
        stopDictation();
        setListening(false);
        setProfesorComment(pickFeedback());
      },
      onError: (message) => {
        setVoiceError(message);
        setListening(false);
      },
      onEnd: () => {
        setListening(false);
        setInterim('');
        dictationRef.current = null;
      },
    });
  };

  const toggleDictation = () => {
    if (listening) {
      stopDictation();
      return;
    }
    startListening();
  };

  const speakProfesorComment = async () => {
    if (!profesorComment) return;
    setVoiceError(null);
    const settings = loadVoiceSettings();
    try {
      await speakText(
        profesorComment,
        settings.profile,
        personality.language ?? 'es',
      );
    } catch (caught) {
      setVoiceError(
        caught instanceof Error ? caught.message : 'No se pudo reproducir la voz.',
      );
    }
  };

  const goToNext = async () => {
    if (!current) return;
    // Guardar respuesta actual antes de avanzar.
    setAnswers({
      ...answers,
      [current.id]: draftAnswer.trim(),
    });
    setDraftAnswer('');
    setInterim('');
    setProfesorComment(null);

    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      setView('results');
      return;
    }
    setIndex(nextIndex);
    // El profesor habla el comentario y luego la siguiente pregunta.
    await speakProfesorComment();
    // Pequeña pausa para que se entienda el comentario antes de la siguiente pregunta.
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    await speakCurrentQuestion();
    startListening();
  };

  const finish = async () => {
    if (busy) return;
    stopAllAudio();
    setBusy(true);
    setError(null);
    try {
      const committedAnswers = {
        ...answers,
        [current?.id ?? '']: draftAnswer.trim(),
      };
      // Reutilizamos el endpoint de calificación del examen oral para dar
      // una nota final al modo conversación.
      const config: OralExamConfig = {
        subject: setupSubject,
        level: setupLevel,
        difficulty: setupDifficulty,
        country: curriculumCountryForRequest(),
        topics: parseTopics(setupTopics),
        count: setupCount,
      };
      const questionsFull = questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        expectedPoints: [],
        rubric: 'Respuesta abierta evaluada por el tutor.',
      }));
      const grade = await requestOralGrade(
        config,
        questionsFull,
        committedAnswers,
        personality,
      );
      setConversationGrade(grade);
      setView('results');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo calificar la conversación. Probá de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    stopAllAudio();
    abortControllerRef.current?.abort();
    onClose();
  };

  const grade = conversationGrade;
  const total = questions.length;
  const answered = Object.values(answers).filter((a) => a.trim().length > 0)
    .length;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Hablar con el profesor"
      description="La IA te hace preguntas como un profesor real. Respondé por voz o escribiendo."
      className="oralConversationDialog"
    >
      {error ? (
        <div className="inlineError" role="alert">
          <Icon name="alert" size={17} />
          <span>{error}</span>
          <button
            type="button"
            className="inlineErrorClose"
            aria-label="Cerrar aviso"
            onClick={() => setError(null)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      {view === 'setup' ? (
        <>
          <div className="studyDialogToolbar">
            <span>Modo conversación con el profesor</span>
            <button
              type="button"
              className="button secondary small"
              onClick={generate}
              disabled={busy || !online}
            >
              {busy ? (
                <>
                  <span className="spinner small" aria-hidden="true" />
                  Iniciando…
                </>
              ) : (
                <>
                  <Icon name="mic" size={15} />
                  Empezar conversación
                </>
              )}
            </button>
          </div>
          <div className="studyForm oralConversationSetup">
            <div className="studyFormIntro">
              <button
                type="button"
                className="textButton"
                onClick={openSetup}
              >
                Volver
              </button>
              <span>
                {PERSONALITY_LABELS[personality.preset]} · {personality.name}
              </span>
            </div>

            <div className="oralSetupGrid">
              <div className="fieldGroup">
                <label className="fieldLabel" htmlFor="conv-subject">
                  Materia
                </label>
                <div className="selectWrap">
                  <select
                    id="conv-subject"
                    className="selectInput"
                    value={setupSubject}
                    onChange={(event) =>
                      setSetupSubject(event.target.value as Subject)
                    }
                    disabled={busy}
                  >
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {SUBJECT_LABELS[subject]}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={16} className="selectChevron" />
                </div>
              </div>
              <div className="fieldGroup">
                <label className="fieldLabel" htmlFor="conv-level">
                  Nivel
                </label>
                <div className="selectWrap">
                  <select
                    id="conv-level"
                    className="selectInput"
                    value={setupLevel}
                    onChange={(event) =>
                      setSetupLevel(event.target.value as Level)
                    }
                    disabled={busy}
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
                <label className="fieldLabel" htmlFor="conv-difficulty">
                  Dificultad
                </label>
                <div className="selectWrap">
                  <select
                    id="conv-difficulty"
                    className="selectInput"
                    value={setupDifficulty}
                    onChange={(event) =>
                      setSetupDifficulty(event.target.value as Difficulty)
                    }
                    disabled={busy}
                  >
                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {DIFFICULTY_LABELS[difficulty]}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={16} className="selectChevron" />
                </div>
              </div>
              <div className="fieldGroup">
                <label className="fieldLabel" htmlFor="conv-voice">
                  Voz del profesor
                </label>
                <div className="selectWrap">
                  <select
                    id="conv-voice"
                    className="selectInput"
                    value={voiceSettings.profile}
                    onChange={(event) => {
                      const next = saveVoiceSettings({
                        ...voiceSettings,
                        profile: event.target.value as VoiceProfile,
                      });
                      setVoiceSettings(next);
                    }}
                    disabled={busy}
                  >
                    {Object.entries(VOICE_PROFILE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                  <Icon name="chevronDown" size={16} className="selectChevron" />
                </div>
              </div>
            </div>

            <div className="fieldGroup">
              <span className="fieldLabel">Preguntas</span>
              <div
                className="countSwitch"
                role="group"
                aria-label="Cantidad de preguntas"
              >
                {ORAL_COUNT_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      setupCount === value
                        ? 'countOption isActive'
                        : 'countOption'
                    }
                    aria-pressed={setupCount === value}
                    onClick={() => setSetupCount(value)}
                    disabled={busy}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="fieldGroup">
              <label className="fieldLabel" htmlFor="conv-topics">
                Temas <span className="fieldOptional">(separados por comas)</span>
              </label>
              <input
                id="conv-topics"
                className="textInput"
                value={setupTopics}
                onChange={(event) => setSetupTopics(event.target.value)}
                maxLength={500}
                placeholder="Ej.: la Revolución Francesa, células, ecuaciones"
                disabled={busy}
              />
            </div>

            <div className="oralPersonalityRow">
              <span>
                <small>Personalidad</small>
                <strong>
                  {PERSONALITY_LABELS[personality.preset]} · {personality.name}
                </strong>
              </span>
              <button
                type="button"
                className="textButton"
                onClick={onOpenSettings}
              >
                Cambiar
              </button>
            </div>

            <div className="oralPersonalityRow">
              <span>
                <small>Modo de voz</small>
                <strong>
                  {voiceSettings.mode === 'browser'
                    ? `Navegador · ${VOICE_PROFILE_LABELS[voiceSettings.profile]}`
                    : voiceSettings.mode === 'cloned'
                      ? voiceSettings.clonedLabel ?? 'Mi voz clonada'
                      : 'Voz externa (ElevenLabs)'}
                </strong>
              </span>
              <button
                type="button"
                className="textButton"
                onClick={onOpenSettings}
              >
                Configurar
              </button>
            </div>

            {!speechSynthesisSupported() ? (
              <p className="fieldHint">
                Este navegador no ofrece voz. La conversación funciona igual
                con texto.
              </p>
            ) : null}
            {!online ? (
              <p className="fieldHint">
                Sin conexión no se pueden generar preguntas ni calificar.
              </p>
            ) : null}

            <p className="fieldHint">
              Cómo funciona: el profesor habla la pregunta, vos respondés con el
              micrófono o escribiendo, y pasan la siguiente.
            </p>
          </div>
        </>
      ) : view === 'conversation' && current ? (
        <div className="oralConversationRunner">
          <div className="studyDialogToolbar">
            <button
              type="button"
              className="textButton"
              onClick={() => {
                stopAllAudio();
                setView('setup');
              }}
            >
              Volver
            </button>
            <span>
              {personality.name} · Pregunta {index + 1} de {total} ·{' '}
              {formatElapsed(elapsed)}
            </span>
          </div>

          <div
            className="quizProgress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            aria-label="Preguntas de la conversación"
          >
            <span
              className="quizProgressFill"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>

          <article className="oralPrompt">
            <p className="eyebrow">Pregunta {index + 1}</p>
            <h3>{current.prompt}</h3>
            <div className="oralPromptActions">
              <button
                type="button"
                className="button secondary small"
                onClick={() => void speakCurrentQuestion()}
                disabled={!speechSynthesisSupported() || busy}
              >
                <Icon name="volume" size={16} />
                Escuchar de nuevo
              </button>
              <button
                type="button"
                className="button ghost small"
                onClick={toggleDictation}
              >
                <Icon name={listening ? 'stop' : 'mic'} size={16} />
                {listening ? 'Detener micrófono' : 'Responder con micrófono'}
              </button>
            </div>
            {voiceError ? (
              <p className="inlineError" role="alert">
                <Icon name="alert" size={15} />
                <span>{voiceError}</span>
              </p>
            ) : null}
            {profesorComment ? (
              <p className="profesorComment" role="status" aria-live="polite">
                <span className="demoPulse" aria-hidden="true" />
                {profesorComment}
              </p>
            ) : null}
          </article>

          <div className="fieldGroup">
            <label className="fieldLabel" htmlFor="conv-answer">
              Tu respuesta
            </label>
            <textarea
              id="conv-answer"
              className="textInput textArea oralAnswer"
              value={draftAnswer}
              onChange={(event) => setDraftAnswer(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Respondé con tus propias palabras…"
              disabled={busy}
            />
            <span className="fieldHint">
              {draftAnswer.length.toLocaleString('es')} / 4.000
              {interim ? ` · escuchando: ${interim}` : ''}
            </span>
            {listening ? (
              <p className="oralListening" role="status" aria-live="polite">
                <span className="demoPulse" aria-hidden="true" />
                Escuchando… hablá con claridad.
              </p>
            ) : null}
          </div>

          <div className="oralRunnerActions">
            {index < total - 1 ? (
              <button
                type="button"
                className="button primary"
                onClick={() => void goToNext()}
                disabled={busy || listening}
              >
                {busy ? (
                  <>
                    <span className="spinner small" aria-hidden="true" />
                    Pasando…
                  </>
                ) : (
                  <>
                    <Icon name="arrowUp" size={17} />
                    Siguiente pregunta
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="button primary"
                onClick={() => void finish()}
                disabled={busy || !online}
              >
                {busy ? (
                  <>
                    <span className="spinner small" aria-hidden="true" />
                    Calificando…
                  </>
                ) : (
                  <>
                    <Icon name="check" size={17} />
                    Terminar y calificar
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                setAnswers({
                  ...answers,
                  [current.id]: draftAnswer.trim(),
                });
                void goToNext();
              }}
              disabled={busy || listening}
            >
              Omitir
            </button>
          </div>
        </div>
      ) : view === 'results' && grade ? (
        <div className="oralConversationResults">
          <div className="studyDialogToolbar">
            <button
              type="button"
              className="textButton"
              onClick={() => setView('setup')}
            >
              Nueva conversación
            </button>
            <span>{formatElapsed(elapsed)}</span>
          </div>

          <header className="oralResultHeader">
            <div>
              <p className="eyebrow">Resultado de la conversación</p>
              <h3>
                Conversación de {SUBJECT_LABELS[setupSubject]}
              </h3>
              <p>
                Respondiste {answered} de {total} preguntas.
              </p>
            </div>
            <div className="oralResultScore">
              <strong>{grade.overallScore}</strong>
              <span>/100</span>
              <span className={zoneClass(grade.zone)}>
                {grade.zone === 'segura'
                  ? 'Zona segura'
                  : grade.zone === 'practica'
                    ? 'Zona de práctica'
                    : 'Zona de refuerzo'}
              </span>
            </div>
          </header>

          <p className="fieldHint">{grade.summary}</p>

          <div className="oralNextSteps">
            <h4>Próximos pasos</h4>
            <ul>
              {grade.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>

          <ol className="oralReview">
            {questions.map((question, questionIndex) => {
              const result = grade.results.find(
                (item) => item.questionId === question.id,
              );
              return (
                <li className="oralReviewItem" key={question.id}>
                  <div className="oralReviewTop">
                    <span className="eyebrow">
                      Pregunta {questionIndex + 1}
                    </span>
                    {result ? <strong>{result.score}/5</strong> : null}
                  </div>
                  <h4>{question.prompt}</h4>
                  <div className="oralReviewColumns">
                    <div>
                      <span className="fieldLabel">Tu respuesta</span>
                      <p>
                        {answers[question.id]?.trim() || 'Sin respuesta.'}
                      </p>
                    </div>
                    <div>
                      <span className="fieldLabel">Respuesta modelo</span>
                      <p>
                        {result?.modelAnswer ?? 'Sin respuesta modelo.'}
                      </p>
                    </div>
                  </div>
                  {result?.strengths.length ? (
                    <p className="oralFeedback isGood">
                      <strong>Fortalezas:</strong>{' '}
                      {result.strengths.join(' · ')}
                    </p>
                  ) : null}
                  {result?.improvements.length ? (
                    <p className="oralFeedback isImprove">
                      <strong>Mejorar:</strong>{' '}
                      {result.improvements.join(' · ')}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="oralRunnerActions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setView('setup')}
            >
              <Icon name="refresh" size={16} />
              Otra conversación
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => setView('setup')}
            >
              Cerrar revisión
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
