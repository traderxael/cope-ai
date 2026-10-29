import { useState } from 'react';
import { SUBJECTS } from '../../shared/schemas/common';
import { formatDateOnlyEs, todayDateOnlyLocal } from '../../shared/date';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type Level,
  type Subject,
} from '../../shared/types';
import { Logo } from './Logo';
import { Icon } from './Icon';
import type { UserProfile } from '../lib/profile';

const LEVELS: Level[] = ['primaria', 'secundaria', 'bachillerato', 'universidad'];

type Stage = 'welcome' | 'profile' | 'setup' | 'ready';

const PROGRESS: Record<Stage, number> = {
  welcome: 10,
  profile: 40,
  setup: 70,
  ready: 100,
};

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [stage, setStage] = useState<Stage>('welcome');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('secundaria');
  const [subjects, setSubjects] = useState<Subject[]>(['math']);
  const [examDate, setExamDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const goTo = (next: Stage) => {
    setError(null);
    setStage(next);
  };

  const next = () => {
    if (!name.trim()) {
      setError('Escribí tu nombre para personalizar el estudio.');
      return;
    }
    goTo('setup');
  };

  const toReady = () => {
    if (subjects.length === 0) {
      setError('Elegí al menos una materia.');
      return;
    }
    if (examDate && examDate < todayDateOnlyLocal()) {
      setError('La fecha de examen debe ser de hoy en adelante.');
      return;
    }
    goTo('ready');
  };

  const finish = () => {
    onComplete({
      name: name.trim(),
      level,
      subjects,
      ...(examDate ? { examDate } : {}),
      createdAt: Date.now(),
    });
  };

  const toggleSubject = (subject: Subject) => {
    setSubjects((previous) =>
      previous.includes(subject)
        ? previous.filter((item) => item !== subject)
        : [...previous, subject],
    );
  };

  const stepLabel =
    stage === 'profile'
      ? 'Paso 1 de 3'
      : stage === 'setup'
        ? 'Paso 2 de 3'
        : stage === 'ready'
          ? 'Paso 3 de 3'
          : 'Tu espacio de estudio';

  const errorBlock = error ? (
    <p className="inlineError" role="alert">
      <Icon name="alert" size={16} />
      <span>{error}</span>
    </p>
  ) : null;

  return (
    <main className="onboardingScreen">
      <div className="onboardingStars" aria-hidden="true" />
      <section className="onboardingCard" aria-labelledby="onboarding-title">
        <div className="onboardingBrand">
          <Logo withWordmark size={38} />
          <span className="onboardingBadge">IA gratis</span>
        </div>

        <div
          className="onboardingProgress"
          role="progressbar"
          aria-label="Progreso del onboarding"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={PROGRESS[stage]}
        >
          <span style={{ width: `${PROGRESS[stage]}%` }} />
        </div>

        {stage === 'welcome' ? (
          <>
            <p className="eyebrow">{stepLabel}</p>
            <h1 id="onboarding-title">Aprender puede ser más simple.</h1>
            <p className="onboardingLead">
              Un tutor que te acompaña, te pregunta y te ayuda a practicar.
              Sin cuenta: tus datos quedan en este dispositivo.
            </p>
            <ul className="onboardingFacts">
              <li>
                <Icon name="book" size={15} />
                14 materias
              </li>
              <li>
                <Icon name="sparkles" size={15} />
                IA gratis
              </li>
              <li>
                <Icon name="shield" size={15} />
                Sin registro
              </li>
            </ul>
            <button
              type="button"
              className="button primary onboardingPrimary"
              onClick={() => goTo('profile')}
            >
              Empezar gratis
              <Icon name="arrowUp" size={17} className="onboardingArrow" />
            </button>
          </>
        ) : null}

        {stage === 'profile' ? (
          <>
            <p className="eyebrow">{stepLabel}</p>
            <h1 id="onboarding-title">Empecemos por tu nombre.</h1>
            <p className="onboardingLead">
              Así Cope puede saludarte y adaptar el tutor a tu nivel.
            </p>
            <label className="fieldLabel" htmlFor="onboarding-name">
              ¿Cómo te llamás?
            </label>
            <input
              id="onboarding-name"
              className="textInput onboardingInput"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
              maxLength={40}
              autoComplete="given-name"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') next();
              }}
            />
            {errorBlock}
            <div className="onboardingActions">
              <button
                type="button"
                className="button ghost"
                onClick={() => goTo('welcome')}
              >
                Atrás
              </button>
              <button type="button" className="button primary" onClick={next}>
                Continuar
                <Icon name="arrowUp" size={17} className="onboardingArrow" />
              </button>
            </div>
          </>
        ) : null}

        {stage === 'setup' ? (
          <>
            <p className="eyebrow">{stepLabel}</p>
            <h1 id="onboarding-title">Armemos tu punto de partida.</h1>
            <p className="onboardingLead">
              Elegí tu nivel y las materias que querés trabajar. Después podés
              cambiarlo en cualquier momento.
            </p>

            <label className="fieldLabel" htmlFor="onboarding-level">
              Nivel
            </label>
            <div className="selectWrap">
              <select
                id="onboarding-level"
                className="selectInput"
                value={level}
                onChange={(event) => setLevel(event.target.value as Level)}
              >
                {LEVELS.map((item) => (
                  <option key={item} value={item}>
                    {LEVEL_LABELS[item]}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={16} className="selectChevron" />
            </div>

            <span className="fieldLabel">Materias</span>
            <div className="onboardingSubjects" role="group" aria-label="Materias">
              {SUBJECTS.filter((subject) => subject !== 'general').map(
                (subject) => (
                  <button
                    key={subject}
                    type="button"
                    className={
                      subjects.includes(subject)
                        ? 'subjectChip isActive'
                        : 'subjectChip'
                    }
                    aria-pressed={subjects.includes(subject)}
                    onClick={() => toggleSubject(subject)}
                  >
                    {SUBJECT_LABELS[subject]}
                  </button>
                ),
              )}
            </div>

            <label className="fieldLabel" htmlFor="onboarding-exam">
              Fecha de examen <span className="fieldOptional">(opcional)</span>
            </label>
            <input
              id="onboarding-exam"
              type="date"
              className="textInput"
              value={examDate}
              min={todayDateOnlyLocal()}
              onChange={(event) => setExamDate(event.target.value)}
            />

            {errorBlock}
            <div className="onboardingActions">
              <button
                type="button"
                className="button ghost"
                onClick={() => goTo('profile')}
              >
                Atrás
              </button>
              <button type="button" className="button primary" onClick={toReady}>
                Continuar
              </button>
            </div>
          </>
        ) : null}

        {stage === 'ready' ? (
          <>
            <p className="eyebrow">{stepLabel}</p>
            <h1 id="onboarding-title">Todo listo, {name.trim()}.</h1>
            <p className="onboardingLead">
              Tu tutor ya tiene tu nivel y tus materias. Podés cambiarlo cuando
              quieras.
            </p>
            <dl className="onboardingSummary">
              <div>
                <dt>Nivel</dt>
                <dd>{LEVEL_LABELS[level]}</dd>
              </div>
              <div>
                <dt>Materias</dt>
                <dd>
                  {subjects.map((subject) => SUBJECT_LABELS[subject]).join(', ')}
                </dd>
              </div>
              <div>
                <dt>Examen</dt>
                <dd>{examDate ? formatDateOnlyEs(examDate) : 'Sin fecha'}</dd>
              </div>
            </dl>
            <div className="onboardingActions">
              <button
                type="button"
                className="button ghost"
                onClick={() => goTo('setup')}
              >
                Atrás
              </button>
              <button type="button" className="button primary" onClick={finish}>
                Entrar a Cope
              </button>
            </div>
          </>
        ) : null}

        <p className="onboardingPrivacy">
          <Icon name="shield" size={14} />
          Sin registro. Cope guarda tu perfil, historial y progreso localmente.
        </p>
      </section>
    </main>
  );
}
