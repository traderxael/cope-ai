import { useEffect, useState } from 'react';
import {
  addDaysDateOnly,
  formatDateOnlyEs,
  pickUpcomingDate,
  todayDateOnlyLocal,
} from '../../../shared/date';
import { LIMITS } from '../../../shared/limits';
import {
  LEVEL_LABELS,
  PLAN_TASK_TYPE_LABELS,
  SUBJECT_LABELS,
  type TutorConfig,
} from '../../../shared/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { requestStudyPlan } from '../../lib/api';
import {
  newId,
  listStudyPlans,
  saveStudyPlan,
  type StudyPlan,
  type StudyPlanTask,
} from '../../lib/storage';

interface StudyPlanDialogProps {
  open: boolean;
  onClose: () => void;
  tutor: TutorConfig;
  online: boolean;
  suggestedExamDate?: string;
}

function parseTopics(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((topic) => topic.trim())
        .filter(Boolean),
    ),
  ];
}

export function StudyPlanDialog({
  open,
  onClose,
  tutor,
  online,
  suggestedExamDate,
}: StudyPlanDialogProps) {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selected, setSelected] = useState<StudyPlan | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examDate, setExamDate] = useState('');
  const [topics, setTopics] = useState('');
  const [days, setDays] = useState('7');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setView('list');
    setExamDate(pickUpcomingDate(suggestedExamDate, todayDateOnlyLocal(), 7));
    setTopics('');
    setDays('7');
    void listStudyPlans()
      .then((stored) => {
        if (cancelled) return;
        setPlans(stored);
        setSelected(stored[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron leer los planes guardados.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, suggestedExamDate]);

  const totalTasks = selected
    ? selected.days.reduce((total, day) => total + day.tasks.length, 0)
    : 0;
  const completedTasks = selected
    ? selected.days.reduce(
        (total, day) =>
          total + day.tasks.filter((task) => task.completed).length,
        0,
      )
    : 0;

  const generate = async () => {
    if (!online || busy) return;
    const today = todayDateOnlyLocal();
    if (!examDate || examDate < today) {
      setError('Elegí una fecha de examen de hoy en adelante.');
      return;
    }
    const dayCount = Number.parseInt(days, 10);
    if (
      !Number.isFinite(dayCount) ||
      dayCount < LIMITS.minPlanDays ||
      dayCount > LIMITS.maxPlanDays
    ) {
      setError(
        `Elegí entre ${LIMITS.minPlanDays} y ${LIMITS.maxPlanDays} días.`,
      );
      return;
    }
    const topicList = parseTopics(topics);
    if (topicList.length > LIMITS.maxPlanTopics) {
      setError(`Podés indicar hasta ${LIMITS.maxPlanTopics} temas.`);
      return;
    }
    const earliestExam = addDaysDateOnly(today, dayCount - 1);
    if (examDate < earliestExam) {
      setError(
        `Para ${dayCount} días de plan, el examen debe ser el ${formatDateOnlyEs(earliestExam)} o después.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await requestStudyPlan({
        subject: tutor.subject,
        level: tutor.level,
        difficulty: 'medium',
        examDate,
        topics: topicList,
        days: dayCount,
      });
      const now = Date.now();
      const plan: StudyPlan = {
        id: newId(),
        title: result.plan.title,
        subject: tutor.subject,
        level: tutor.level,
        examDate: result.plan.examDate,
        topics: result.plan.topics,
        days: result.plan.days.map((day) => ({
          day: day.day,
          focus: day.focus,
          tasks: day.tasks.map((task) => ({
            ...task,
            completed: false,
          })),
        })),
        createdAt: now,
        updatedAt: now,
      };
      await saveStudyPlan(plan);
      setPlans((previous) => [plan, ...previous]);
      setSelected(plan);
      setView('list');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo generar el plan de estudio.',
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (dayNumber: number, taskId: string) => {
    if (!selected) return;
    const updated: StudyPlan = {
      ...selected,
      days: selected.days.map((day) =>
        day.day === dayNumber
          ? {
              ...day,
              tasks: day.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, completed: !task.completed }
                  : task,
              ),
            }
          : day,
      ),
      updatedAt: Date.now(),
    };
    try {
      await saveStudyPlan(updated);
      setSelected(updated);
      setPlans((previous) =>
        previous.map((plan) => (plan.id === updated.id ? updated : plan)),
      );
    } catch {
      setError('No se pudo guardar el avance del plan.');
    }
  };

  const today = todayDateOnlyLocal();
  const planStart = selected
    ? addDaysDateOnly(selected.examDate, -(selected.days.length - 1))
    : today;
  const planExpired = selected ? selected.examDate < today : false;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Plan de examen"
      description="Un plan por días, guardado en este dispositivo."
      className="studyPlanDialog"
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

      {loading ? (
        <div className="studyLoading" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando planes…
        </div>
      ) : view === 'form' ? (
        <div className="studyForm">
          <div className="studyFormIntro">
            <button
              type="button"
              className="textButton"
              onClick={() => setView('list')}
            >
              Volver
            </button>
            <span>
              {SUBJECT_LABELS[tutor.subject]} · {LEVEL_LABELS[tutor.level]}
            </span>
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel" htmlFor="plan-exam-date">
              Fecha del examen
            </label>
            <input
              id="plan-exam-date"
              type="date"
              className="textInput"
              value={examDate}
              min={todayDateOnlyLocal()}
              onChange={(event) => setExamDate(event.target.value)}
              disabled={busy}
            />
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel" htmlFor="plan-topics">
              Temas <span className="fieldOptional">(separados por comas)</span>
            </label>
            <input
              id="plan-topics"
              className="textInput"
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              maxLength={500}
              placeholder="Ej.: derivadas, límites, optimización"
              disabled={busy}
            />
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel" htmlFor="plan-days">
              Días disponibles
            </label>
            <input
              id="plan-days"
              type="number"
              className="textInput"
              value={days}
              min={LIMITS.minPlanDays}
              max={LIMITS.maxPlanDays}
              onChange={(event) => setDays(event.target.value)}
              disabled={busy}
            />
          </div>

          {!online ? (
            <p className="fieldHint">
              Sin conexión: podés ver los planes guardados, pero no generar uno
              nuevo.
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
                Generando…
              </>
            ) : (
              <>
                <Icon name="sparkles" size={17} />
                Generar plan
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="studyDialogToolbar">
            <span>
              {plans.length === 0
                ? 'Sin planes todavía'
                : `${plans.length} plan${plans.length === 1 ? '' : 'es'}`}
            </span>
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                setView('form');
                setError(null);
              }}
            >
              <Icon name="plus" size={15} />
              Nuevo plan
            </button>
          </div>

          {plans.length > 0 ? (
            <ul className="planList">
              {plans.map((plan) => {
                const total = plan.days.reduce(
                  (sum, day) => sum + day.tasks.length,
                  0,
                );
                const done = plan.days.reduce(
                  (sum, day) =>
                    sum + day.tasks.filter((task) => task.completed).length,
                  0,
                );
                return (
                  <li key={plan.id}>
                    <button
                      type="button"
                      className={
                        selected?.id === plan.id
                          ? 'planListItem isActive'
                          : 'planListItem'
                      }
                      onClick={() => setSelected(plan)}
                      aria-pressed={selected?.id === plan.id}
                    >
                      <span>
                        <strong>{plan.title}</strong>
                        <small>
                          Examen: {formatDateOnlyEs(plan.examDate)} ·{' '}
                          {plan.subject ? SUBJECT_LABELS[plan.subject] : ''}
                          {plan.examDate < today ? ' · vencido' : ''}
                        </small>
                      </span>
                      <span className="planListProgress">
                        {done}/{total}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="studyEmpty">
              <span className="studyEmptyIcon">
                <Icon name="calendar" size={24} />
              </span>
              <h3>Planificá sin improvisar</h3>
              <p>
                Indicá la fecha del examen y los temas. Cope arma un plan por
                días con estudio, práctica y repaso.
              </p>
            </div>
          )}

          {selected ? (
            <section
              className="planDetail"
              aria-labelledby="plan-detail-title"
            >
              <header className="planDetailHeader">
                <div>
                  <p className="eyebrow">
                    {planExpired ? 'Plan vencido' : 'Plan activo'}
                  </p>
                  <h3 id="plan-detail-title">{selected.title}</h3>
                  <p>
                    Examen: {formatDateOnlyEs(selected.examDate)} ·{' '}
                    {SUBJECT_LABELS[selected.subject]} ·{' '}
                    {LEVEL_LABELS[selected.level]}
                  </p>
                </div>
                <span className="planProgressText">
                  {completedTasks}/{totalTasks} tareas
                </span>
              </header>
              <div
                className="progressBar"
                role="progressbar"
                aria-label="Avance del plan"
                aria-valuemin={0}
                aria-valuemax={totalTasks}
                aria-valuenow={completedTasks}
              >
                <span
                  style={{
                    width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>

              <ol className="planDays">
                {selected.days.map((day) => (
                  <li className="planDay" key={day.day}>
                    <div className="planDayHeader">
                      <span className="planDayNumber">Día {day.day}</span>
                      <span>{formatDateOnlyEs(addDaysDateOnly(planStart, day.day - 1))}</span>
                    </div>
                    <p className="planDayFocus">{day.focus}</p>
                    <ul className="planTasks">
                      {day.tasks.map((task: StudyPlanTask) => (
                        <li key={task.id}>
                          <label className="planTask">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() =>
                                void toggleTask(day.day, task.id)
                              }
                            />
                            <span className="planTaskCopy">
                              <span
                                className={
                                  task.completed
                                    ? 'planTaskTitle isDone'
                                    : 'planTaskTitle'
                                }
                              >
                                {task.title}
                              </span>
                              <span className="planTaskMeta">
                                {PLAN_TASK_TYPE_LABELS[task.type]} ·{' '}
                                {task.minutes} min
                              </span>
                              {task.description ? (
                                <span className="planTaskDescription">
                                  {task.description}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      )}
    </Dialog>
  );
}
