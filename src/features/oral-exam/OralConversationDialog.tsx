import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '../../../shared/limits';
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
  OralQuestion,
  OralReplyStage,
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
import {
  ApiError,
  isAbortError,
  requestOralExam,
  requestOralGrade,
  requestOralReply,
} from '../../lib/api';
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
type AnswerStage = Extract<OralReplyStage, 'initial' | 'followup'>;

interface OralConversationDialogProps {
  open: boolean;
  onClose: () => void;
  tutor: TutorConfig;
  personality: PersonalityConfig;
  voice: { tts: boolean; clone: boolean };
  online: boolean;
  onOpenSettings: () => void;
  latestMaterial?: string;
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  latestMaterial,
}: OralConversationDialogProps) {
  const [view, setView] = useState<View>('setup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] =
    useState<VoiceSettingsValue>(loadVoiceSettings);
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<OralQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [conversationGrade, setConversationGrade] =
    useState<OralGradeResponse | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [profesorComment, setProfesorComment] = useState<string | null>(null);
  const [profesorFollowUp, setProfesorFollowUp] = useState<string | null>(null);
  const [replyStage, setReplyStage] = useState<AnswerStage>('initial');
  const [profesorBusy, setProfesorBusy] = useState(false);
  const [handsFree, setHandsFree] = useState(() =>
    speechRecognitionSupported(),
  );
  const [setupSubject, setSetupSubject] = useState<Subject>(tutor.subject);
  const [setupLevel, setSetupLevel] = useState<Level>(tutor.level);
  const [setupDifficulty, setSetupDifficulty] =
    useState<Difficulty>('medium');
  const [setupTopics, setSetupTopics] = useState('');
  const [setupCount, setSetupCount] = useState<Count>(5);
  const [useMaterial, setUseMaterial] = useState(false);
  const dictationRef = useRef<Dictation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const replyAbortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(open);
  const viewRef = useRef<View>('setup');
  const indexRef = useRef(0);
  const questionsRef = useRef<OralQuestion[]>([]);
  const answersRef = useRef<Record<string, string>>({});
  const stageRef = useRef<AnswerStage>('initial');
  const handsFreeRef = useRef(handsFree);
  const listeningRef = useRef(false);
  const followUpRef = useRef('');

  const current = questions[index];

  useEffect(() => {
    activeRef.current = open;
  }, [open]);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      dictationRef.current?.abort();
      dictationRef.current = null;
      listeningRef.current = false;
      setListening(false);
      abortControllerRef.current?.abort();
      replyAbortRef.current?.abort();
      return;
    }
    viewRef.current = 'setup';
    indexRef.current = 0;
    questionsRef.current = [];
    answersRef.current = {};
    stageRef.current = 'initial';
    followUpRef.current = '';
    listeningRef.current = false;
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
    setProfesorFollowUp(null);
    setReplyStage('initial');
    setProfesorBusy(false);
    setSetupSubject(tutor.subject);
    setSetupLevel(tutor.level);
    setSetupDifficulty('medium');
    setSetupTopics('');
    setSetupCount(5);
    setUseMaterial(false);
    setVoiceSettings(loadVoiceSettings());
    const controller = abortControllerRef.current;
    return () => {
      stopSpeaking();
      dictationRef.current?.abort();
      dictationRef.current = null;
      listeningRef.current = false;
      controller?.abort();
      replyAbortRef.current?.abort();
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
    listeningRef.current = false;
    setListening(false);
    setInterim('');
  };

  const stopAllAudio = () => {
    stopSpeaking();
    stopDictation();
  };

  const goToView = (next: View) => {
    viewRef.current = next;
    setView(next);
  };

  const setStage = (next: AnswerStage) => {
    stageRef.current = next;
    setReplyStage(next);
  };

  const commitAnswers = (next: Record<string, string>) => {
    answersRef.current = next;
    setAnswers(next);
  };

  const buildConfig = (): OralExamConfig => ({
    subject: setupSubject,
    level: setupLevel,
    difficulty: setupDifficulty,
    country: curriculumCountryForRequest(),
    topics: parseTopics(setupTopics),
    count: setupCount,
    ...(useMaterial && latestMaterial
      ? {
          sourceText: latestMaterial.slice(0, LIMITS.maxSourceTextChars),
        }
      : {}),
  });

  const openSetup = () => {
    stopAllAudio();
    replyAbortRef.current?.abort();
    setError(null);
    goToView('setup');
  };

  const generate = async () => {
    if (!online || busy) return;
    const config = buildConfig();
    setBusy(true);
    setError(null);
    let generated: OralQuestion[] | null = null;
    try {
      const exam = await requestOralExam(config, personality);
      generated = exam.questions;
      questionsRef.current = exam.questions;
      answersRef.current = {};
      indexRef.current = 0;
      conversationStartTime = Date.now();
      setQuestions(exam.questions);
      setIndex(0);
      setDraftAnswer('');
      setAnswers({});
      setInterim('');
      setProfesorComment(null);
      setProfesorFollowUp(null);
      followUpRef.current = '';
      setStage('initial');
      goToView('conversation');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo iniciar la conversación. Probá de nuevo.',
      );
    } finally {
      setBusy(false);
    }

    const first = generated?.[0];
    if (!first || !handsFreeRef.current) return;
    await speakQuestion(first);
    await armMic(0, 'initial', 400);
  };

  const speakLine = async (text: string): Promise<void> => {
    const clean = text.trim();
    if (!clean) return;
    setVoiceError(null);
    const settings = loadVoiceSettings();
    const ownerCode = loadOwnerCode();
    if (settings.mode !== 'browser' && voice.tts && ownerCode.trim()) {
      try {
        await speakExternal(clean, {
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
      await speakText(
        clean,
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
  };

  const speakQuestion = (question: OralQuestion): Promise<void> =>
    speakLine(question.prompt);

  const speakCurrentQuestion = async () => {
    if (!current) return;
    await speakQuestion(current);
  };

  const askProfessor = async (
    stage: OralReplyStage,
    question: OralQuestion,
    answer: string,
    followUp = '',
  ): Promise<{ reply: string; followUp: string } | null> => {
    if (!answer.trim()) return null;
    if (!online) {
      const fallback = pickFeedback();
      setProfesorComment(fallback);
      setProfesorFollowUp(null);
      followUpRef.current = '';
      return { reply: fallback, followUp: '' };
    }
    replyAbortRef.current?.abort();
    const controller = new AbortController();
    replyAbortRef.current = controller;
    setProfesorBusy(true);
    setVoiceError(null);
    try {
      const result = await requestOralReply(
        buildConfig(),
        personality,
        { question, answer, stage, followUp },
        controller.signal,
      );
      if (controller.signal.aborted) return null;
      const nextFollowUp = stage === 'initial' ? result.followUp.trim() : '';
      setProfesorComment(result.reply);
      setProfesorFollowUp(nextFollowUp || null);
      followUpRef.current = nextFollowUp;
      return { reply: result.reply, followUp: nextFollowUp };
    } catch (caught) {
      if (isAbortError(caught)) return null;
      const fallback = pickFeedback();
      setProfesorComment(fallback);
      setProfesorFollowUp(null);
      followUpRef.current = '';
      setVoiceError(
        caught instanceof ApiError
          ? `No se pudo consultar al profesor (${caught.message}). Sigo con el guion.`
          : 'No se pudo consultar al profesor. Sigo con el guion.',
      );
      return { reply: fallback, followUp: '' };
    } finally {
      // Si otra respuesta ya tomó el control, no apagues su estado de espera.
      if (replyAbortRef.current === controller) replyAbortRef.current = null;
    }
  };

  const runProfessorTurn = async (
    stage: AnswerStage,
    question: OralQuestion,
    answer: string,
    askedFollowUp: string,
  ) => {
    const fromIndex = indexRef.current;
    try {
      const result = await askProfessor(
        stage,
        question,
        answer,
        askedFollowUp,
      );
      if (!result) return;
      if (
        !activeRef.current ||
        viewRef.current !== 'conversation' ||
        indexRef.current !== fromIndex
      ) {
        return;
      }
      await speakLine(result.reply);
      if (result.followUp) {
        await speakLine(result.followUp);
        if (
          !activeRef.current ||
          viewRef.current !== 'conversation' ||
          indexRef.current !== fromIndex
        ) {
          return;
        }
        setStage('followup');
        await armMic(fromIndex, 'followup');
        return;
      }
      await wait(350);
      if (
        !activeRef.current ||
        viewRef.current !== 'conversation' ||
        indexRef.current !== fromIndex
      ) {
        return;
      }
      await advanceToNext(fromIndex);
    } finally {
      // La espera cubre también la voz y el rearme, para que nadie dispare
      // otra respuesta mientras el profesor sigue hablando.
      setProfesorBusy(false);
    }
  };

  const handleFinalTranscript = (
    text: string,
    question: OralQuestion,
    stage: AnswerStage,
  ) => {
    const clean = text.trim();
    if (!clean) return;
    const previous = answersRef.current[question.id] ?? '';
    const combined = (
      stage === 'followup' && previous
        ? `${previous} ${clean}`.trim()
        : clean
    ).slice(0, LIMITS.maxOralAnswerChars);
    const askedFollowUp = followUpRef.current;
    commitAnswers({ ...answersRef.current, [question.id]: combined });
    setDraftAnswer(combined);
    setInterim('');
    setProfesorComment(null);
    setProfesorFollowUp(null);
    followUpRef.current = '';
    if (handsFreeRef.current) {
      void runProfessorTurn(stage, question, combined, askedFollowUp);
    }
  };

  const startListening = (
    forIndex = indexRef.current,
    stage: AnswerStage = stageRef.current,
  ) => {
    const question = questionsRef.current[forIndex];
    if (!question || !activeRef.current) return;
    if (!speechRecognitionSupported()) {
      setVoiceError(
        'Este navegador no admite dictado por voz. Escribí tu respuesta.',
      );
      return;
    }
    if (listeningRef.current) return;
    dictationRef.current?.abort();
    setVoiceError(null);
    setInterim('');
    listeningRef.current = true;
    setListening(true);
    dictationRef.current = startDictation({
      onInterim: (text) => {
        if (listeningRef.current) setInterim(text);
      },
      onFinal: (text) => {
        dictationRef.current?.abort();
        dictationRef.current = null;
        listeningRef.current = false;
        setListening(false);
        handleFinalTranscript(text, question, stage);
      },
      onError: (message) => {
        dictationRef.current = null;
        listeningRef.current = false;
        setVoiceError(message);
        setListening(false);
      },
      onEnd: () => {
        dictationRef.current = null;
        listeningRef.current = false;
        setListening(false);
        setInterim('');
      },
    });
  };

  const toggleDictation = () => {
    if (listeningRef.current) {
      stopDictation();
      return;
    }
    startListening();
  };

  const armMic = async (
    forIndex: number,
    stage: AnswerStage,
    delayMs = 350,
  ) => {
    await wait(delayMs);
    if (
      !activeRef.current ||
      viewRef.current !== 'conversation' ||
      indexRef.current !== forIndex ||
      !handsFreeRef.current
    ) {
      return;
    }
    startListening(forIndex, stage);
  };

  const advanceToNext = async (fromIndex: number): Promise<boolean> => {
    const next = fromIndex + 1;
    const nextQuestion = questionsRef.current[next];
    if (!nextQuestion) return false;
    indexRef.current = next;
    setIndex(next);
    setDraftAnswer('');
    setInterim('');
    setProfesorComment(null);
    setProfesorFollowUp(null);
    followUpRef.current = '';
    setStage('initial');
    await speakQuestion(nextQuestion);
    if (
      !activeRef.current ||
      viewRef.current !== 'conversation' ||
      indexRef.current !== next
    ) {
      return true;
    }
    await armMic(next, 'initial', 400);
    return true;
  };

  const goToNext = async () => {
    const question = current;
    if (!question || busy || profesorBusy) return;
    stopDictation();
    const answer = draftAnswer.trim();
    const fromIndex = indexRef.current;
    const stage = stageRef.current;
    const askedFollowUp = followUpRef.current;
    if (answer) {
      commitAnswers({ ...answersRef.current, [question.id]: answer });
    }
    setDraftAnswer(answer);
    setInterim('');
    setProfesorComment(null);
    setProfesorFollowUp(null);
    followUpRef.current = '';
    try {
      const result = answer
        ? await askProfessor(
            stage === 'followup' ? 'followup' : 'closing',
            question,
            answer,
            stage === 'followup' ? askedFollowUp : '',
          )
        : null;
      if (!activeRef.current || viewRef.current !== 'conversation') return;
      if (result) await speakLine(result.reply);
      await wait(350);
      if (!activeRef.current || viewRef.current !== 'conversation') return;
      await advanceToNext(fromIndex);
    } finally {
      setProfesorBusy(false);
    }
  };

  const skipQuestion = async () => {
    if (busy || profesorBusy) return;
    const question = current;
    const fromIndex = indexRef.current;
    stopDictation();
    setDraftAnswer('');
    setInterim('');
    setProfesorComment(null);
    setProfesorFollowUp(null);
    followUpRef.current = '';
    setStage('initial');
    if (question) {
      commitAnswers({ ...answersRef.current, [question.id]: '' });
    }
    if (fromIndex + 1 >= questionsRef.current.length) {
      await finish('');
      return;
    }
    await advanceToNext(fromIndex);
  };

  const finish = async (draft = draftAnswer) => {
    if (busy || profesorBusy) return;
    stopAllAudio();
    replyAbortRef.current?.abort();
    setBusy(true);
    setError(null);
    try {
      const committedAnswers = { ...answersRef.current };
      if (current) committedAnswers[current.id] = draft.trim();
      commitAnswers(committedAnswers);
      // Reutilizamos el endpoint de calificación del examen oral para dar
      // una nota final al modo conversación.
      const config = buildConfig();
      const questionsFull = questionsRef.current.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        expectedPoints: q.expectedPoints,
        rubric: q.rubric,
      }));
      const grade = await requestOralGrade(
        config,
        questionsFull,
        committedAnswers,
        personality,
      );
      setConversationGrade(grade);
      goToView('results');
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
    replyAbortRef.current?.abort();
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
                  disabled={busy}
                />
                <span className="switchVisual" aria-hidden="true" />
              </label>
            ) : null}

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
              Cómo funciona: el profesor habla la pregunta, escucha tu respuesta,
              te da feedback y te repregunta. En manos libres el micrófono se
              rearma solo después de cada respuesta.
            </p>
          </div>
        </>
      ) : view === 'conversation' && current ? (
        <div className="oralConversationRunner">
          <div className="studyDialogToolbar">
            <button
              type="button"
              className="textButton"
              onClick={openSetup}
            >
              Volver
            </button>
            <span>
              {personality.name} · Pregunta {index + 1} de {total} ·{' '}
              {formatElapsed(elapsed)}
            </span>
          </div>

          {speechRecognitionSupported() ? (
            <label className="switchRow handsFreeRow">
              <span>
                <span className="fieldLabel">Manos libres</span>
                <span className="fieldHint">
                  El micrófono se rearma solo después de cada respuesta.
                </span>
              </span>
              <input
                type="checkbox"
                className="switchInput"
                checked={handsFree}
                onChange={(event) => {
                  const next = event.target.checked;
                  setHandsFree(next);
                  handsFreeRef.current = next;
                  if (!next) {
                    stopDictation();
                  } else if (!profesorBusy && !busy) {
                    startListening();
                  }
                }}
                disabled={busy}
              />
              <span className="switchVisual" aria-hidden="true" />
            </label>
          ) : null}

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
                disabled={
                  !speechSynthesisSupported() || busy || profesorBusy || listening
                }
              >
                <Icon name="volume" size={16} />
                Escuchar de nuevo
              </button>
              <button
                type="button"
                className="button ghost small"
                onClick={toggleDictation}
                disabled={busy || profesorBusy}
              >
                <Icon name={listening ? 'stop' : 'mic'} size={16} />
                {listening ? 'Detener micrófono' : 'Responder con micrófono'}
              </button>
            </div>
            {replyStage === 'followup' ? (
              <p className="oralFollowUpBadge">
                Respondé a la repregunta del profesor.
              </p>
            ) : null}
            {voiceError ? (
              <p className="inlineError" role="alert">
                <Icon name="alert" size={15} />
                <span>{voiceError}</span>
              </p>
            ) : null}
            {profesorBusy && !profesorComment ? (
              <p
                className="profesorComment isThinking"
                role="status"
                aria-live="polite"
              >
                <span className="spinner small" aria-hidden="true" />
                El profesor está pensando…
              </p>
            ) : null}
            {profesorComment ? (
              <div className="profesorReply" role="status" aria-live="polite">
                <p className="profesorComment">
                  <span className="demoPulse" aria-hidden="true" />
                  {profesorComment}
                </p>
                {profesorFollowUp ? (
                  <p className="profesorFollowUp">{profesorFollowUp}</p>
                ) : null}
              </div>
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
              placeholder={
                replyStage === 'followup'
                  ? 'Respondé a la repregunta…'
                  : 'Respondé con tus propias palabras…'
              }
              disabled={busy || profesorBusy || listening}
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
            {handsFree && !listening && !profesorBusy && !busy ? (
              <p className="fieldHint">
                Manos libres activo: el micrófono vuelve solo después de la
                respuesta del profesor.
              </p>
            ) : null}
          </div>

          <div className="oralRunnerActions">
            {index < total - 1 ? (
              <button
                type="button"
                className="button primary"
                onClick={() => void goToNext()}
                disabled={busy || profesorBusy || listening}
              >
                {profesorBusy ? (
                  <>
                    <span className="spinner small" aria-hidden="true" />
                    El profesor responde…
                  </>
                ) : busy ? (
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
                disabled={busy || profesorBusy || !online}
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
              onClick={() => void skipQuestion()}
              disabled={busy || profesorBusy || listening}
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
              onClick={openSetup}
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
              onClick={openSetup}
            >
              <Icon name="refresh" size={16} />
              Otra conversación
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={openSetup}
            >
              Cerrar revisión
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
