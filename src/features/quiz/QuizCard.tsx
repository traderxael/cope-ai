import { useEffect, useRef, useState } from 'react';
import type { QuizResponse } from '../../../shared/types';
import { Icon } from '../../components/Icon';

interface QuizCardProps {
  quiz: QuizResponse;
  label: string;
  onClose: () => void;
  onRetry: () => void;
  retrying: boolean;
}

function scoreMessage(score: number, total: number): string {
  if (score === total) return 'Excelente. Dominás el tema.';
  if (score >= total - 2) {
    return 'Buen trabajo. Repasá las explicaciones de las que fallaron.';
  }
  return 'Es un buen punto de partida. Revisá las explicaciones y probá otra vez.';
}

export function QuizCard({
  quiz,
  label,
  onClose,
  onRetry,
  retrying,
}: QuizCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    Array.from({ length: quiz.questions.length }, () => null),
  );

  useEffect(() => {
    setAnswers(Array.from({ length: quiz.questions.length }, () => null));
  }, [quiz]);

  useEffect(() => {
    cardRef.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  }, []);

  const answeredCount = answers.filter((answer) => answer !== null).length;
  const allAnswered = answeredCount === quiz.questions.length;
  const score = quiz.questions.reduce(
    (total, question, index) =>
      answers[index] === question.correctIndex ? total + 1 : total,
    0,
  );

  const answer = (questionIndex: number, optionIndex: number) => {
    setAnswers((previous) => {
      if (previous[questionIndex] !== null) return previous;
      const next = [...previous];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  return (
    <section className="quizCard" ref={cardRef} aria-labelledby="quiz-title">
      <header className="quizHeader">
        <div>
          <p className="eyebrow">Práctica</p>
          <h2 id="quiz-title">{label}</h2>
        </div>
        <div className="quizHeaderActions">
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
              disabled={answered}
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
                        disabled={answered}
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

      {allAnswered ? (
        <div className="quizSummary" role="status">
          <div>
            <p className="eyebrow">Resultado</p>
            <p className="quizScore">
              {score}
              <span> / {quiz.questions.length}</span>
            </p>
            <p>{scoreMessage(score, quiz.questions.length)}</p>
          </div>
          <div className="quizSummaryActions">
            <button
              type="button"
              className="button secondary"
              onClick={onRetry}
              disabled={retrying}
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
          Elegí una opción en cada pregunta para ver el resultado.
        </p>
      )}
    </section>
  );
}
