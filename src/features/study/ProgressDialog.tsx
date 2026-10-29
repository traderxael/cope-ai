import { useEffect, useState } from 'react';
import { SUBJECTS } from '../../../shared/schemas/common';
import {
  DIFFICULTY_LABELS,
  SUBJECT_LABELS,
} from '../../../shared/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { listPracticeResults, type PracticeResult } from '../../lib/storage';
import {
  achievements,
  findWeakAreas,
  summarizePractice,
  weekActivity,
} from '../../lib/progress';

interface ProgressDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProgressDialog({ open, onClose }: ProgressDialogProps) {
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listPracticeResults()
      .then((stored) => {
        if (!cancelled) setResults(stored);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo leer el progreso guardado.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const summary = summarizePractice(results);
  const weakAreas = findWeakAreas(summary);
  const week = weekActivity(results);
  const badges = achievements(summary);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Progreso"
      description="Prácticas guardadas en este dispositivo."
      className="progressDialog"
    >
      {loading ? (
        <div className="studyLoading" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando progreso…
        </div>
      ) : error ? (
        <p className="inlineError" role="alert">
          <Icon name="alert" size={17} />
          <span>{error}</span>
        </p>
      ) : results.length === 0 ? (
        <div className="studyEmpty">
          <span className="studyEmptyIcon">
            <Icon name="chart" size={24} />
          </span>
          <h3>Todavía no hay prácticas guardadas</h3>
          <p>
            Generá una práctica desde el tutor. Al terminarla, vas a ver acá tu
            precisión, tu racha y la actividad reciente.
          </p>
        </div>
      ) : (
        <>
          <div className="progressMetrics">
            <div className="progressMetric">
              <span>Precisión</span>
              <strong>{Math.round(summary.accuracy * 100)}%</strong>
            </div>
            <div className="progressMetric">
              <span>Prácticas</span>
              <strong>{summary.attempts}</strong>
            </div>
            <div className="progressMetric">
              <span>Preguntas</span>
              <strong>{summary.questions}</strong>
            </div>
            <div className="progressMetric">
              <span>Racha</span>
              <strong>
                {summary.streakDays}
                <small> día{summary.streakDays === 1 ? '' : 's'}</small>
              </strong>
            </div>
          </div>

          <section
            className="progressSection"
            aria-labelledby="progress-week"
          >
            <h3 id="progress-week">Esta semana</h3>
            <ol className="weekActivity">
              {week.map((day) => (
                <li
                  key={day.date}
                  className={day.active ? 'isActive' : undefined}
                >
                  <span className="weekActivityDot" aria-hidden="true" />
                  <span className="weekActivityLabel">{day.label}</span>
                  <span className="srOnly">
                    {day.active
                      ? `${day.questions} preguntas`
                      : 'Sin actividad'}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="progressSection"
            aria-labelledby="progress-achievements"
          >
            <h3 id="progress-achievements">Logros</h3>
            <ul className="achievements">
              {badges.map((badge) => (
                <li
                  key={badge.id}
                  className={
                    badge.unlocked
                      ? 'achievement isUnlocked'
                      : 'achievement isLocked'
                  }
                >
                  <span className="achievementIcon" aria-hidden="true">
                    <Icon name="sparkles" size={16} />
                  </span>
                  <span className="achievementText">
                    <strong>{badge.label}</strong>
                    <span>{badge.description}</span>
                  </span>
                  <span className="srOnly">
                    {badge.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="progressSection"
            aria-labelledby="progress-weak"
          >
            <h3 id="progress-weak">Puntos a reforzar</h3>
            {weakAreas.length ? (
              <ul className="progressWeak">
                {weakAreas.map((item) => (
                  <li key={item.subject}>
                    <strong>{SUBJECT_LABELS[item.subject]}</strong>
                    <span>
                      {Math.round(item.accuracy * 100)}% en {item.questions}{' '}
                      preguntas
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="progressWeakEmpty">
                Buen trabajo: no hay materias practicadas por debajo del 70%.
              </p>
            )}
          </section>

          <section className="progressSection" aria-labelledby="progress-subjects">
            <h3 id="progress-subjects">Por materia</h3>
            <div className="progressSubjects">
              {SUBJECTS.map((subject) => {
                const item = summary.bySubject[subject];
                return (
                  <div className="progressSubject" key={subject}>
                    <div className="progressSubjectTop">
                      <span>{SUBJECT_LABELS[subject]}</span>
                      <span>
                        {item.attempts === 0
                          ? 'Sin prácticas'
                          : `${Math.round(item.accuracy * 100)}% · ${item.correct}/${item.questions}`}
                      </span>
                    </div>
                    <div
                      className="progressBar"
                      role="progressbar"
                      aria-label={`Precisión en ${SUBJECT_LABELS[subject]}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(item.accuracy * 100)}
                    >
                      <span
                        style={{
                          width: `${Math.round(item.accuracy * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="progressSection" aria-labelledby="progress-recent">
            <h3 id="progress-recent">Últimas prácticas</h3>
            <ul className="progressRecent">
              {summary.recent.map((result) => (
                <li key={result.id}>
                  <span className="progressRecentMain">
                    <strong>{SUBJECT_LABELS[result.subject]}</strong>
                    <span>
                      {result.topic?.trim() || 'Repaso general'} ·{' '}
                      {DIFFICULTY_LABELS[result.difficulty]}
                    </span>
                  </span>
                  <span className="progressRecentScore">
                    {result.score} / {result.questionCount}
                  </span>
                  <time
                    dateTime={new Date(result.completedAt).toISOString()}
                  >
                    {new Date(result.completedAt).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Dialog>
  );
}
