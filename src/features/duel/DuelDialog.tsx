import { useCallback, useEffect, useState } from 'react';
import type { QuizQuestion } from '../../../shared/schemas/quiz';
import type { TutorConfig } from '../../../shared/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { requestQuiz } from '../../lib/api';
import { curriculumCountryForRequest } from '../../lib/curriculum';
import { loadPersonality } from '../../lib/personality';
import { scoreDuel, type DuelAnswer, type DuelResult } from '../../lib/duel';
import { addDuelStars } from '../../lib/studyRewards';

interface DuelDialogProps {
  open: boolean;
  onClose: () => void;
  tutor: TutorConfig;
  online: boolean;
}

const SECONDS_PER_QUESTION = 15;
const OPPONENT_ACCURACY = 0.6;

export function DuelDialog({ open, onClose, tutor, online }: DuelDialogProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DuelAnswer[]>([]);
  const [remaining, setRemaining] = useState(SECONDS_PER_QUESTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DuelResult | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setQuestions([]);
    setIndex(0);
    setAnswers([]);
    setResult(null);
    setError(null);
    setRemaining(SECONDS_PER_QUESTION);
    setLoading(true);
    void requestQuiz(
      {
        subject: tutor.subject,
        level: tutor.level,
        count: 5,
        difficulty: 'medium',
        examFormat: 'general',
        country: curriculumCountryForRequest(),
        language: loadPersonality().language,
      },
      undefined,
    )
      .then((response) => {
        if (!cancelled) setQuestions(response.questions.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo preparar el duelo. Probá de nuevo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tutor.subject, tutor.level]);

  const finish = useCallback(
    (nextAnswers: DuelAnswer[]) => {
      const score = scoreDuel(questions, nextAnswers, OPPONENT_ACCURACY);
      addDuelStars(score.stars);
      setResult(score);
    },
    [questions],
  );

  const answer = (choice: number) => {
    const next = [...answers, choice];
    setAnswers(next);
    if (index + 1 >= questions.length) finish(next);
    else {
      setIndex(index + 1);
      setRemaining(SECONDS_PER_QUESTION);
    }
  };

  const skip = useCallback(() => {
    const next = [...answers, null];
    setAnswers(next);
    if (index + 1 >= questions.length) finish(next);
    else {
      setIndex(index + 1);
      setRemaining(SECONDS_PER_QUESTION);
    }
  }, [answers, finish, index, questions.length]);

  useEffect(() => {
    if (!open || loading || result || error || !questions.length) return undefined;
    if (remaining <= 0) {
      skip();
      return undefined;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [open, loading, result, error, questions.length, remaining, skip]);

  const question = questions[index];
  const answered = answers.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Duelo"
      description="Cinco preguntas contra el reloj y un rival simulado."
      className="progressDialog duelDialog"
    >
      {loading ? (
        <div className="studyLoading" role="status">
          <span className="spinner" aria-hidden="true" />
          Preparando el duelo…
        </div>
      ) : error ? (
        <p className="messageError">{error}</p>
      ) : result ? (
        <div className="duelResult">
          <span className="duelResultIcon" aria-hidden="true">
            <Icon name={result.won ? 'sparkles' : 'target'} size={30} />
          </span>
          <h3>{result.won ? 'Duelo ganado' : 'Duelo perdido'}</h3>
          <p className="duelScore">
            Vos <strong>{result.playerScore}</strong> · Rival{' '}
            <strong>{result.opponentScore}</strong>
          </p>
          <p className="duelStars">
            {result.stars} {result.stars === 1 ? 'estrella ganada' : 'estrellas ganadas'}
          </p>
          <button type="button" className="button" onClick={onClose}>
            Listo
          </button>
        </div>
      ) : question ? (
        <>
          <div className="duelHud">
            <span>
              Pregunta {index + 1} de {questions.length}
            </span>
            <span className="duelTimer" aria-live="off">
              {remaining} s
            </span>
          </div>
          <div
            className="duelTrack"
            role="progressbar"
            aria-label="Avance del duelo"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answered}
          >
            <div
              className="duelTrackFill"
              style={{ width: `${(answered / questions.length) * 100}%` }}
            />
          </div>
          <h3 className="duelPrompt">{question.prompt}</h3>
          <div className="duelOptions">
            {question.options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                className="duelOption"
                onClick={() => answer(optionIndex)}
              >
                {option}
              </button>
            ))}
          </div>
          <button type="button" className="textButton" onClick={skip}>
            Pasar
          </button>
          {!online ? <p className="duelDemo">Modo de prueba sin conexión.</p> : null}
        </>
      ) : null}
    </Dialog>
  );
}
