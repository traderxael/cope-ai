import { useEffect, useMemo, useState } from 'react';
import { dateOnlyFromEpochLocal } from '../../../shared/date';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import {
  BADGE_TIER_LABELS,
  buildBadges,
  longestStreak,
  nextBadge,
  unlockedCount,
  type Badge,
  type BadgeTier,
} from '../../lib/achievements';
import { listPracticeResults, type PracticeResult } from '../../lib/storage';
import {
  DAILY_GOAL_OPTIONS,
  readDailyGoal,
  readStudyLog,
  storeDailyGoal,
  streakFromDates,
  studyMinutesOn,
  studyWeek,
  type StudyLog,
} from '../../lib/studyLog';
import { BadgeArt } from './BadgeArt';

interface BadgeDialogProps {
  open: boolean;
  onClose: () => void;
}

const TIER_ORDER: BadgeTier[] = [1, 2, 3];

const RING_RADIUS = 38;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function activeDates(
  results: PracticeResult[],
  log: StudyLog,
): string[] {
  const dates = new Set<string>();
  for (const result of results) {
    dates.add(dateOnlyFromEpochLocal(result.completedAt));
  }
  for (const [date, minutes] of Object.entries(log)) {
    if (minutes > 0) dates.add(date);
  }
  return [...dates];
}

export function BadgeDialog({ open, onClose }: BadgeDialogProps) {
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [log, setLog] = useState<StudyLog>({});
  const [goal, setGoal] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void listPracticeResults()
      .then((stored) => {
        if (!cancelled) setResults(stored);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    if (!cancelled) {
      setLog(readStudyLog());
      setGoal(readDailyGoal());
    }
    return () => {
      cancelled = true;
    };
  }, [open]);

  const view = useMemo(() => {
    const dates = activeDates(results, log);
    const streak = streakFromDates(dates);
    const best = Math.max(streak, longestStreak(dates));
    const badges = buildBadges(streak);
    const next = nextBadge(badges);
    const week = studyWeek(Date.now(), log);
    const minutes = studyMinutesOn(week[week.length - 1]?.date ?? '', log);
    const ratio = goal > 0 ? Math.min(1, minutes / goal) : 0;
    return {
      streak,
      best,
      badges,
      next,
      unlocked: unlockedCount(badges),
      week,
      minutes,
      ratio,
    };
  }, [results, log, goal]);

  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    badges: view.badges.filter((badge) => badge.tier === tier),
  }));

  const changeGoal = (minutes: number) => {
    setGoal(minutes);
    storeDailyGoal(minutes);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Insignias"
      description="Tu progreso en órbitas: cada insignia se desbloquea con días seguidos de estudio."
      className="progressDialog badgeDialog"
    >
      {loading ? (
        <div className="studyLoading" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando insignias…
        </div>
      ) : (
        <>
          <div className="badgeHero">
            <span className="badgeHeroIcon" aria-hidden="true">
              <Icon name="target" size={26} />
            </span>
            <div className="badgeHeroCopy">
              <h3>
                {view.streak === 0
                  ? 'Empezá tu primera racha'
                  : `Racha actual: ${view.streak} día${view.streak === 1 ? '' : 's'}`}
              </h3>
              <p>
                {view.next
                  ? `Próxima insignia de streak: ${view.next.label} — ${view.next.missing} día${view.next.missing === 1 ? '' : 's'} más`
                  : 'Desbloqueaste todas las insignias. ¡Impresionante!'}
              </p>
              <div className="badgeHeroStats">
                <span className="badgeStat">
                  Mejor racha <strong>{view.best}</strong>
                </span>
                <span className="badgeStat">
                  Insignias <strong>{view.unlocked}/{view.badges.length}</strong>
                </span>
              </div>
            </div>
          </div>

          <section className="progressSection" aria-labelledby="badge-streak">
            <h3 id="badge-streak">Racha semanal</h3>
            <ul className="streakTrack">
              {view.week.map((day) => (
                <li key={day.date}>
                  <span
                    className={
                      day.isToday
                        ? 'streakDot isToday'
                        : day.active
                          ? 'streakDot isDone'
                          : 'streakDot'
                    }
                    title={
                      day.minutes > 0
                        ? `${day.minutes.toFixed(1)} min de estudio`
                        : 'Sin actividad'
                    }
                  >
                    {day.active ? '✓' : ''}
                  </span>
                  <span className="streakDay">{day.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="progressSection" aria-labelledby="badge-goal">
            <h3 id="badge-goal">Meta de estudio diaria</h3>
            <div className="goalRing">
              <svg
                className="goalRingSvg"
                viewBox="0 0 92 92"
                role="img"
                aria-label={`Meta diaria: ${view.minutes.toFixed(1)} de ${goal} minutos`}
              >
                <defs>
                  <linearGradient
                    id="astraGoalGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#6d8bff" />
                    <stop offset="60%" stopColor="#a06bff" />
                    <stop offset="100%" stopColor="#4fd8ff" />
                  </linearGradient>
                </defs>
                <circle
                  className="goalRingTrack"
                  cx="46"
                  cy="46"
                  r={RING_RADIUS}
                />
                <circle
                  className="goalRingValue"
                  cx="46"
                  cy="46"
                  r={RING_RADIUS}
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - view.ratio)}
                />
              </svg>
              <div className="goalRingCopy">
                <h4>
                  <span className="goalRingAmount">
                    {view.minutes.toFixed(1)}
                  </span>{' '}
                  / {goal} min
                </h4>
                <p>
                  {view.ratio >= 1
                    ? '¡Meta del día completada! Seguí así.'
                    : 'Se suma el tiempo de prácticas y sesiones de enfoque.'}
                </p>
                <div className="goalChipRow" role="group" aria-label="Meta diaria">
                  {DAILY_GOAL_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        option === goal
                          ? 'goalChip isActive'
                          : 'goalChip'
                      }
                      aria-pressed={option === goal}
                      onClick={() => changeGoal(option)}
                    >
                      {option} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {grouped.map((group) => (
            <section
              className="progressSection"
              key={group.tier}
              aria-labelledby={`badge-tier-${group.tier}`}
            >
              <div className="badgeTier" id={`badge-tier-${group.tier}`}>
                {BADGE_TIER_LABELS[group.tier]}
              </div>
              <ul className="badgeGrid">
                {group.badges.map((badge) => (
                  <BadgeTile badge={badge} key={badge.id} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </Dialog>
  );
}

function BadgeTile({ badge }: { badge: Badge }) {
  return (
    <li
      className={
        badge.unlocked ? 'badgeTile isUnlocked' : 'badgeTile isLocked'
      }
    >
      <span className="badgeArt" aria-hidden="true">
        <BadgeArt icon={badge.icon} />
        {badge.unlocked ? null : (
          <span className="badgeLock">
            <Icon name="shield" size={13} />
          </span>
        )}
      </span>
      <h4>{badge.label}</h4>
      <p>{badge.description}</p>
      <span className="srOnly">
        {badge.unlocked
          ? 'Desbloqueada'
          : `Bloqueada. Faltan ${badge.missing} días de racha.`}
      </span>
    </li>
  );
}
