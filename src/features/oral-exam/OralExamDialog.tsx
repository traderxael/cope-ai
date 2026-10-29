import { useCallback, useEffect, useRef, useState } from 'react';
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
  ORAL_ZONE_LABELS,
  PERSONALITY_LABELS,
  SUBJECT_LABELS,
} from '../../../shared/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { ApiError, requestOralExam, requestOralGrade } from '../../lib/api';
import { curriculumCountryForRequest } from '../../lib/curriculum';
import {
  newId,
  deleteOralExam,
  listOralExams,
  saveOralExam,
  type OralExamSession,
} from '../../lib/storage';
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
import type { VoiceCapabilities } from '../../lib/api';

type View = 'list' | 'setup' | 'runner' | 'results';

interface OralExamDialogProps {
  open: boolean;
  onClose: () => void;
  tutor: TutorConfig;
  personality: PersonalityConfig;
  voice: VoiceCapabilities;
  online: boolean;
  onOpenSettings: () => void;
}

type Count = (typeof ORAL_COUNT_OPTIONS)[number];

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

function formatSessionDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function zoneClass(zone: OralGradeResponse['zone']): string {
  return `oralZone oralZone-${zone}`;
}

export function OralExamDialog({
  open,
  onClose,
  tutor,
  personality,
  voice,
  online,
  onOpenSettings,
}: OralExamDialogProps) {
  const [view, setView] = useState<View>('list');
  const [exams, setExams] = useState<OralExamSession[]>([]);
  const [active, setActive] = useState<OralExamSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceSettings, setVoiceSettings] =
    useState<VoiceSettingsValue>(loadVoiceSettings);
  const [setupSubject, setSetupSubject] = useState<Subject>(tutor.subject);
  const [setupLevel, setSetupLevel] = useState<Level>(tutor.level);
  const [setupDifficulty, setSetupDifficulty] =
    useState<Difficulty>('medium');
  const [setupTopics, setSetupTopics] = useState('');
  const [setupCount, setSetupCount] = useState<Count>(5);
  const dictationRef = useRef<Dictation | null>(null);

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      dictationRef.current?.abort();
      dictationRef.current = null;
      setListening(false);
      return;
    }
    let cancelled = false;
    setView('list');
    setActive(null);
    setError(null);
    setVoiceError(null);
    setSetupSubject(tutor.subject);
    setSetupLevel(tutor.level);
    setSetupDifficulty('medium');
    setSetupTopics('');
    setSetupCount(5);
    setVoiceSettings(loadVoiceSettings());
    setLoading(true);
    void listOralExams()
      .then((stored) => {
        if (!cancelled) setExams(stored);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo leer el historial de exámenes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      stopSpeaking();
      dictationRef.current?.abort();
      dictationRef.current = null;
    };
  }, [open, tutor.subject, tutor.level]);

  useEffect(() => {
    if (view !== 'runner' || !active) return;
    const update = () =>
      setElapsed(Math.max(0, Math.round((Date.now() - active.startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [view, active]);

  const current = active?.questions[index];

  useEffect(() => {
    if (view !== 'runner' || !active || !current) return;
    if ((active.answers[current.id] ?? '') === draftAnswer) return;
    const timer = window.setTimeout(() => {
      const updated: OralExamSession = {
        ...active,
        answers: { ...active.answers, [current.id]: draftAnswer },
        updatedAt: Date.now(),
      };
      setActive(updated);
      setExams((previous) =>
        previous.map((exam) => (exam.id === updated.id ? updated : exam)),
      );
      void saveOralExam(updated);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draftAnswer, view, active, current]);

  const stopDictation = () => {
    dictationRef.current?.abort();
    dictationRef.current = null;
    setListening(false);
    setInterim('');
  };

  const commitAnswer = useCallback(async (): Promise<OralExamSession | null> => {
    if (!active || !current) return active;
    const updated: OralExamSession = {
      ...active,
      answers: { ...active.answers, [current.id]: draftAnswer },
      updatedAt: Date.now(),
    };
    setActive(updated);
    setExams((previous) =>
      previous.map((exam) => (exam.id === updated.id ? updated : exam)),
    );
    await saveOralExam(updated);
    return updated;
  }, [active, current, draftAnswer]);

  const openSetup = () => {
    stopSpeaking();
    stopDictation();
    setError(null);
    setSetupSubject(active?.config.subject ?? tutor.subject);
    setSetupLevel(active?.config.level ?? tutor.level);
    setSetupDifficulty(active?.config.difficulty ?? 'medium');
    setSetupTopics(active?.config.topics.join(', ') ?? '');
    setSetupCount(active?.config.count ?? 5);
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
      const session: OralExamSession = {
        id: newId(),
        config,
        personality,
        questions: exam.questions,
        answers: {},
        status: 'in_progress',
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveOralExam(session);
      setExams((previous) => [session, ...previous]);
      setActive(session);
      setIndex(0);
      setDraftAnswer('');
      setView('runner');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo generar el examen oral. Probá de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const openSession = (session: OralExamSession) => {
    stopSpeaking();
    stopDictation();
    setActive(session);
    setError(null);
    setVoiceError(null);
    if (session.status === 'graded' && session.grade) {
      setView('results');
      return;
    }
    const firstPending = session.questions.findIndex(
      (question) => !session.answers[question.id]?.trim(),
    );
    const nextIndex = firstPending >= 0 ? firstPending : 0;
    setIndex(nextIndex);
    setDraftAnswer(
      session.answers[session.questions[nextIndex]?.id ?? ''] ?? '',
    );
    setView('runner');
  };

  const goTo = async (nextIndex: number, answerOverride?: string) => {
    if (!active || !current) return;
    const answer = answerOverride ?? draftAnswer;
    const updated: OralExamSession = {
      ...active,
      answers: { ...active.answers, [current.id]: answer },
      updatedAt: Date.now(),
    };
    setActive(updated);
    setExams((previous) =>
      previous.map((exam) => (exam.id === updated.id ? updated : exam)),
    );
    await saveOralExam(updated);
    stopSpeaking();
    stopDictation();
    setIndex(nextIndex);
    setDraftAnswer(
      updated.answers[updated.questions[nextIndex]?.id ?? ''] ?? '',
    );
  };

  const finish = async () => {
    if (!active || busy) return;
    if (listening) stopDictation();
    stopSpeaking();
    setBusy(true);
    setError(null);
    try {
      const committed = (await commitAnswer()) ?? active;
      const grade = await requestOralGrade(
        committed.config,
        committed.questions,
        committed.answers,
        committed.personality,
      );
      const graded: OralExamSession = {
        ...committed,
        grade,
        status: 'graded',
        completedAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveOralExam(graded);
      setActive(graded);
      setExams((previous) =>
        previous.map((exam) => (exam.id === graded.id ? graded : exam)),
      );
      setView('results');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo corregir el examen. Probá de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const speak = async () => {
    if (!current) return;
    setVoiceError(null);
    const settings = loadVoiceSettings();
    const ownerCode = loadOwnerCode();
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
        return;
      } catch (caught) {
        setVoiceError(
          `${
            caught instanceof Error ? caught.message : 'La voz externa falló.'
          } Usando la voz del navegador.`,
        );
      }
    }
    try {
      await speakText(current.prompt, settings.profile);
    } catch (caught) {
      setVoiceError(
        caught instanceof Error ? caught.message : 'No se pudo reproducir la voz.',
      );
    }
  };

  const toggleDictation = () => {
    if (listening) {
      stopDictation();
      return;
    }
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

  const removeExam = async (session: OralExamSession) => {
    try {
      await deleteOralExam(session.id);
      setExams((previous) => previous.filter((exam) => exam.id !== session.id));
      if (active?.id === session.id) {
        setActive(null);
        setView('list');
      }
    } catch {
      setError('No se pudo borrar el examen.');
    }
  };

  const close = () => {
    stopSpeaking();
    stopDictation();
    if (view === 'runner' && active) void commitAnswer();
    onClose();
  };

  const grade = active?.grade;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Examen oral"
      description="Simulá un examen oral con preguntas, voz y corrección."
      className="oralExamDialog"
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

      {view === 'list' ? (
        <>
          <div className="studyDialogToolbar">
            <span>{exams.length === 0 ? 'Sin exámenes todavía' : `${exams.length} examen${exams.length === 1 ? '' : 'es'}`}</span>
            <button
              type="button"
              className="button secondary small"
              onClick={openSetup}
            >
              <Icon name="plus" size={15} />
              Nuevo examen
            </button>
          </div>
          {loading ? (
            <div className="studyLoading" role="status">
              <span className="spinner" aria-hidden="true" />
              Cargando exámenes…
            </div>
          ) : exams.length === 0 ? (
            <div className="studyEmpty">
              <span className="studyEmptyIcon">
                <Icon name="mic" size={24} />
              </span>
              <h3>Practicá el examen oral</h3>
              <p>
                La IA te hace preguntas una por una, podés responder por texto o
                micrófono y al final recibís una corrección con zonas de
                desempeño.
              </p>
            </div>
          ) : (
            <ul className="oralExamList">
              {exams.map((exam) => (
                <li className="oralExamItem" key={exam.id}>
                  <button
                    type="button"
                    className="oralExamMain"
                    onClick={() => openSession(exam)}
                  >
                    <span>
                      <strong>
                        Simulacro de {SUBJECT_LABELS[exam.config.subject]}
                      </strong>
                      <small>
                        {LEVEL_LABELS[exam.config.level]} ·{' '}
                        {exam.questions.length} preguntas ·{' '}
                        {formatSessionDate(exam.startedAt)}
                      </small>
                    </span>
                    <span className="oralExamStatus">
                      {exam.status === 'graded' && exam.grade
                        ? `${exam.grade.overallScore}/100`
                        : 'En curso'}
                    </span>
                  </button>
                  <div className="oralExamActions">
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() => openSession(exam)}
                    >
                      {exam.status === 'graded' ? 'Ver resultado' : 'Continuar'}
                    </button>
                    <button
                      type="button"
                      className="iconButton tiny"
                      aria-label={`Borrar examen de ${SUBJECT_LABELS[exam.config.subject]}`}
                      onClick={() => void removeExam(exam)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : view === 'setup' ? (
        <div className="studyForm oralExamSetup">
          <div className="studyFormIntro">
            <button type="button" className="textButton" onClick={() => setView('list')}>
              Volver
            </button>
            <span>{PERSONALITY_LABELS[personality.preset]} · {personality.name}</span>
          </div>

          <div className="oralSetupGrid">
            <div className="fieldGroup">
              <label className="fieldLabel" htmlFor="oral-subject">
                Materia
              </label>
              <div className="selectWrap">
                <select
                  id="oral-subject"
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
              <label className="fieldLabel" htmlFor="oral-level">
                Nivel
              </label>
              <div className="selectWrap">
                <select
                  id="oral-level"
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
              <label className="fieldLabel" htmlFor="oral-difficulty">
                Dificultad
              </label>
              <div className="selectWrap">
                <select
                  id="oral-difficulty"
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
              <label className="fieldLabel" htmlFor="oral-voice">
                Voz
              </label>
              <div className="selectWrap">
                <select
                  id="oral-voice"
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
                  {Object.entries(VOICE_PROFILE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={16} className="selectChevron" />
              </div>
            </div>
          </div>

          <div className="fieldGroup">
            <span className="fieldLabel">Preguntas</span>
            <div className="countSwitch" role="group" aria-label="Cantidad de preguntas">
              {ORAL_COUNT_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={setupCount === value ? 'countOption isActive' : 'countOption'}
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
            <label className="fieldLabel" htmlFor="oral-topics">
              Temas <span className="fieldOptional">(separados por comas)</span>
            </label>
            <input
              id="oral-topics"
              className="textInput"
              value={setupTopics}
              onChange={(event) => setSetupTopics(event.target.value)}
              maxLength={500}
              placeholder="Ej.: ley de Ohm, circuitos, energía"
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
            <button type="button" className="textButton" onClick={onOpenSettings}>
              Cambiar
            </button>
          </div>

          <div className="oralPersonalityRow">
            <span>
              <small>Voz de la IA</small>
              <strong>
                {voiceSettings.mode === 'browser'
                  ? `Navegador · ${VOICE_PROFILE_LABELS[voiceSettings.profile]}`
                  : voiceSettings.mode === 'cloned'
                    ? (voiceSettings.clonedLabel ?? 'Mi voz clonada')
                    : 'ElevenLabs (voz externa)'}
              </strong>
            </span>
            <button type="button" className="textButton" onClick={onOpenSettings}>
              Configurar
            </button>
          </div>

          {!speechSynthesisSupported() ? (
            <p className="fieldHint">
              Este navegador no ofrece voz. El examen funciona igual con texto.
            </p>
          ) : null}
          {!online ? (
            <p className="fieldHint">
              Sin conexión no se puede generar ni corregir el examen.
            </p>
          ) : null}

          <button
            type="button"
            className="button primary"
            onClick={() => void generate()}
            disabled={busy || !online}
          >
            {busy ? (
              <>
                <span className="spinner small" aria-hidden="true" />
                Generando examen…
              </>
            ) : (
              <>
                <Icon name="sparkles" size={17} />
                Generar examen oral
              </>
            )}
          </button>
        </div>
      ) : view === 'runner' && active && current ? (
        <div className="oralRunner">
          <div className="studyDialogToolbar">
            <button
              type="button"
              className="textButton"
              onClick={() => {
                stopSpeaking();
                stopDictation();
                void commitAnswer().then(() => setView('list'));
              }}
            >
              Volver
            </button>
            <span>
              {active.personality.name} · Pregunta {index + 1} de{' '}
              {active.questions.length} · {formatElapsed(elapsed)}
            </span>
          </div>

          <div
            className="quizProgress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={active.questions.length}
            aria-valuenow={index + 1}
            aria-label="Preguntas del examen oral"
          >
            <span
              className="quizProgressFill"
              style={{
                width: `${((index + 1) / active.questions.length) * 100}%`,
              }}
            />
          </div>

          <article className="oralPrompt">
            <p className="eyebrow">Pregunta {index + 1}</p>
            <h3>{current.prompt}</h3>
            <div className="oralPromptActions">
              <button
                type="button"
                className="button secondary small"
                onClick={() => void speak()}
                disabled={!speechSynthesisSupported()}
              >
                <Icon name="volume" size={16} />
                Escuchar
              </button>
              <button
                type="button"
                className="button ghost small"
                onClick={toggleDictation}
              >
                <Icon name={listening ? 'stop' : 'mic'} size={16} />
                {listening ? 'Detener dictado' : 'Responder con micrófono'}
              </button>
            </div>
            {voiceError ? (
              <p className="inlineError" role="alert">
                <Icon name="alert" size={15} />
                <span>{voiceError}</span>
              </p>
            ) : null}
          </article>

          <div className="fieldGroup">
            <label className="fieldLabel" htmlFor="oral-answer">
              Tu respuesta
            </label>
            <textarea
              id="oral-answer"
              className="textInput textArea oralAnswer"
              value={draftAnswer}
              onChange={(event) => setDraftAnswer(event.target.value)}
              rows={6}
              maxLength={4_000}
              placeholder="Explicá con tus palabras, justificá y da un ejemplo."
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
            <p className="fieldHint">
              El micrófono usa el reconocimiento del navegador. Solo se envía el
              texto transcripto, no el audio.
            </p>
          </div>

          <div className="oralRunnerActions">
            {index < active.questions.length - 1 ? (
              <button
                type="button"
                className="button primary"
                onClick={() => void goTo(index + 1)}
                disabled={busy}
              >
                Siguiente pregunta
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
                    Corrigiendo…
                  </>
                ) : (
                  <>
                    <Icon name="check" size={17} />
                    Terminar y corregir
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                void goTo(
                  index < active.questions.length - 1 ? index + 1 : index,
                  '',
                );
              }}
              disabled={busy}
            >
              Omitir
            </button>
          </div>
        </div>
      ) : view === 'results' && active && grade ? (
        <div className="oralResults">
          <div className="studyDialogToolbar">
            <button type="button" className="textButton" onClick={() => setView('list')}>
              Volver al historial
            </button>
            <span>{formatSessionDate(active.completedAt ?? active.updatedAt)}</span>
          </div>

          <header className="oralResultHeader">
            <div>
              <p className="eyebrow">Resultado</p>
              <h3>Simulacro de {SUBJECT_LABELS[active.config.subject]}</h3>
              <p>{grade.summary}</p>
            </div>
            <div className="oralResultScore">
              <strong>{grade.overallScore}</strong>
              <span>/100</span>
              <span className={zoneClass(grade.zone)}>
                {ORAL_ZONE_LABELS[grade.zone]}
              </span>
            </div>
          </header>

          <div className="oralNextSteps">
            <h4>Próximos pasos</h4>
            <ul>
              {grade.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>

          <ol className="oralReview">
            {active.questions.map((question, questionIndex) => {
              const result = grade.results.find(
                (item) => item.questionId === question.id,
              );
              return (
                <li className="oralReviewItem" key={question.id}>
                  <div className="oralReviewTop">
                    <span className="eyebrow">Pregunta {questionIndex + 1}</span>
                    {result ? (
                      <strong>{result.score}/5</strong>
                    ) : null}
                  </div>
                  <h4>{question.prompt}</h4>
                  <div className="oralReviewColumns">
                    <div>
                      <span className="fieldLabel">Tu respuesta</span>
                      <p>{active.answers[question.id]?.trim() || 'Sin respuesta.'}</p>
                    </div>
                    <div>
                      <span className="fieldLabel">Respuesta modelo</span>
                      <p>{result?.modelAnswer ?? 'Sin respuesta modelo.'}</p>
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
            <button type="button" className="button secondary" onClick={openSetup}>
              <Icon name="refresh" size={16} />
              Otra vez
            </button>
            <button type="button" className="button ghost" onClick={() => setView('list')}>
              Cerrar revisión
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
