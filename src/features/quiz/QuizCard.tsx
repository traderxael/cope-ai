import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  DIFFICULTY_LABELS,
  LEVEL_LABELS,
  SUBJECT_LABELS,
} from '../../../shared/types';
import {
  practiceTimeLimitSeconds,
  type PracticeSession,
  type PracticeSettings,
} from '../study/practice';
import { newId, type PracticeResult } from '../../lib/storage';
import { Icon } from '../../components/Icon';

interface QuizCardProps {
  session: PracticeSession;
  label: string;
  onClose: () => void;
  onRetry: (settings: PracticeSettings) => void;
  retrying: boolean;
  online: boolean;
  onComplete: (result: PracticeResult) => void;
}

function scoreMessage(score: number, total: number): string {
  if (score === total) return 'Excelente. Dominás el tema.';
  if (score >= total - 2) {
    return 'Buen trabajo. Repasá las explicaciones de las que fallaron.';
  }
  return 'Es un buen punto de partida. Revisá las explicaciones y probá otra vez.';
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function QuizCard({
  session,
  label,
  onClose,
  onRetry,
  retrying,
  online,
  onComplete,
}: QuizCardProps) {
  const { quiz, settings } = session;
  const timeLimitSeconds = practiceTimeLimitSeconds(settings);
  const cardRef = useRef<HTMLElement>(null);
  const feedbackRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const completedRef = useRef(false);
  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    Array.from({ length: quiz.questions.length }, () => null),
  );
  const [completed, setCompleted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(timeLimitSeconds);
  const [timerNotice, setTimerNotice] = useState('');

  const answeredCount = answers.filter((answer) => answer !== null).length;
  const allAnswered = answeredCount === quiz.questions.length;
  const score = quiz.questions.reduce(
    (total, question, index) =>
      answers[index] === question.correctIndex ? total + 1 : total,
    0,
  );

  useEffect(() => {
    cardRef.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  }, []);

  const finish = useCallback(
    (isExpired: boolean) => {
      if (completedRef.current) return;
      completedRef.current = true;
      const completedAt = Date.now();
      const elapsed = Math.max(
        0,
        Math.round((completedAt - session.startedAt) / 1000),
      );
      const finalScore = quiz.questions.reduce(
        (total, question, index) =>
          answers[index] === question.correctIndex ? total + 1 : total,
        0,
      );
      setCompleted(true);
      setExpired(isExpired);
      onComplete({
        id: newId(),
        subject: session.subject,
        level: session.level,
        difficulty: settings.difficulty,
        topic: settings.topic,
        questionCount: quiz.questions.length,
        timed: settings.timed,
        durationSeconds: settings.timed
          ? Math.min(elapsed, timeLimitSeconds)
          : elapsed,
        startedAt: session.startedAt,
        completedAt,
        score: finalScore,
        questions: quiz.questions,
        answers,
      });
    },
    [answers, onComplete, quiz.questions, session, settings, timeLimitSeconds],
  );

  useEffect(() => {
    if (allAnswered) finish(false);
  }, [allAnswered, finish]);

  useEffect(() => {
    if (!settings.timed || completed) return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
      const seconds = Math.max(0, timeLimitSeconds - elapsed);
      setRemaining(seconds);
      if (seconds <= 0) finish(true);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [
    completed,
    finish,
    session.startedAt,
    settings.timed,
    timeLimitSeconds,
  ]);

  useEffect(() => {
    if (!settings.timed) return;
    if ([60, 30, 10].includes(remaining)) {
      setTimerNotice(`Quedan ${remaining} segundos.`);
    }
  }, [remaining, settings.timed]);

  const answer = (questionIndex: number, optionIndex: number) => {
    if (completed) return;
    setAnswers((previous) => {
      if (previous[questionIndex] !== null) return previous;
      const next = [...previous];
      next[questionIndex] = optionIndex;
      return next;
    });
    window.setTimeout(() => {
      feedbackRefs.current[questionIndex]?.focus();
    }, 30);
  };

  return (
    <section className="quizCard" ref={cardRef} aria-labelledby="quiz-title">
      <header className="quizHeader">
        <div>
          <p className="eyebrow">Práctica</p>
          <h2 id="quiz-title">{label}</h2>
          <p className="quizMeta">
            {SUBJECT_LABELS[session.subject]} · {LEVEL_LABELS[session.level]} ·{' '}
            {DIFFICULTY_LABELS[settings.difficulty]} ·{' '}
            {quiz.questions.length} preguntas
          </p>
        </div>
        <div className="quizHeaderActions">
          {settings.timed ? (
            <span
              className={
                remaining <= 30 ? 'quizTimer isUrgent' : 'quizTimer'
              }
              role="timer"
              aria-label="Tiempo restante"
            >
              <Icon name="timer" size={16} />
              {formatTime(remaining)}
            </span>
          ) : null}
          {quiz.demo ? <span className="chip demoChip">Demo</span> : null}
          <button
            type="button"
            className="iconButton"
            aria-label="Cerrar práctica"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </header>

      <p className="srOnly" aria-live="polite">
        {timerNotice}
      </p>

      <div className="quizProgressRow">
        <div
          className="quizProgress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={quiz.questions.length}
          aria-valuenow={answeredCount}
          aria-label="Preguntas respondidas"
        >
          <span
            className="quizProgressFill"
            style={{
              width: `${(answeredCount / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
        <span className="quizProgressLabel">
          {answeredCount} de {quiz.questions.length}
        </span>
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        {quiz.questions.map((question, questionIndex) => {
          const selected = answers[questionIndex];
          const answered = selected !== null;
          return (
            <fieldset
              className="quizQuestion"
              key={question.id}
              disabled={answered || completed}
            >
              <legend>
                <span className="quizNumber">
                  {String(questionIndex + 1).padStart(2, '0')}
                </span>
                <span>{question.prompt}</span>
              </legend>
              <div className="quizOptions">
                {question.options.map((option, optionIndex) => {
                  const isCorrect =
                    answered && optionIndex === question.correctIndex;
                  const isWrong =
                    answered &&
                    selected === optionIndex &&
                    optionIndex !== question.correctIndex;
                  return (
                    <label
                      key={`${question.id}-${optionIndex}`}
                      className={[
                        'quizOption',
                        isCorrect ? 'isCorrect' : '',
                        isWrong ? 'isWrong' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="radio"
                        name={`quiz-${question.id}`}
                        value={optionIndex}
                        checked={selected === optionIndex}
                        onChange={() => answer(questionIndex, optionIndex)}
                        disabled={answered || completed}
                      />
                      <span className="optionLetter">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="optionText">{option}</span>
                      {isCorrect ? (
                        <Icon
                          name="check"
                          size={17}
                          className="optionResultIcon"
                        />
                      ) : isWrong ? (
                        <Icon
                          name="close"
                          size={17}
                          className="optionResultIcon"
                        />
                      ) : null}
                    </label>
                  );
                })}
              </div>
              {answered ? (
                <p
                  ref={(element) => {
                    feedbackRefs.current[questionIndex] = element;
                  }}
                  tabIndex={-1}
                  className={
                    selected === question.correctIndex
                      ? 'quizFeedback isCorrect'
                      : 'quizFeedback isWrong'
                  }
                  aria-live="polite"
                >
                  {selected === question.correctIndex
                    ? 'Correcto. '
                    : 'No exactamente. '}
                  {question.explanation}
                </p>
              ) : null}
            </fieldset>
          );
        })}
      </form>

      {completed ? (
        <div className="quizSummary" role="status">
          <div>
            <p className="eyebrow">
              {expired ? 'Tiempo agotado' : 'Resultado'}
            </p>
            <p className="quizScore">
              {score}
              <span> / {quiz.questions.length}</span>
            </p>
            <p>
              {expired
                ? 'Se terminó el tiempo. Revisá las explicaciones y probá otra vez.'
                : scoreMessage(score, quiz.questions.length)}
            </p>
            <p className="quizSavedNote">
              Resultado guardado en este dispositivo.
            </p>
          </div>
          <div className="quizSummaryActions">
            <button
              type="button"
              className="button secondary"
              onClick={() => onRetry(settings)}
              disabled={retrying || !online}
            >
              {retrying ? (
                <>
                  <span className="spinner small" aria-hidden="true" />
                  Generando…
                </>
              ) : (
                <>
                  <Icon name="refresh" size={16} />
                  Otra práctica
                </>
              )}
            </button>
            <button type="button" className="button ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <p className="quizHint">
          <Icon name="info" size={15} />
          {settings.timed
            ? 'El tiempo corre. Elegí una opción en cada pregunta.'
            : 'Elegí una opción en cada pregunta para ver el resultado.'}
        </p>
      )}
    </section>
  );
}
