import { useState } from 'react';
import { SUBJECTS } from '../../shared/schemas/common';
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

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('secundaria');
  const [subjects, setSubjects] = useState<Subject[]>(['math']);
  const [examDate, setExamDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (!name.trim()) {
      setError('Escribí tu nombre para personalizar el estudio.');
      return;
    }
    setError(null);
    setStep(1);
  };

  const finish = () => {
    if (subjects.length === 0) {
      setError('Elegí al menos una materia.');
      return;
    }
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

  return (
    <main className="onboardingScreen">
      <div className="onboardingStars" aria-hidden="true" />
      <section className="onboardingCard" aria-labelledby="onboarding-title">
        <div className="onboardingBrand">
          <Logo withWordmark size={38} />
          <span className="onboardingBadge">IA gratis</span>
        </div>

        {step === 0 ? (
          <>
            <p className="eyebrow">Tu espacio de estudio</p>
            <h1 id="onboarding-title">Aprender puede ser más simple.</h1>
            <p className="onboardingLead">
              Un tutor que te acompaña, te pregunta y te ayuda a practicar.
              Sin cuenta: tus datos quedan en este dispositivo.
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
            {error ? (
              <p className="inlineError" role="alert">
                <Icon name="alert" size={16} />
                <span>{error}</span>
              </p>
            ) : null}
            <button type="button" className="button primary onboardingPrimary" onClick={next}>
              Continuar
              <Icon name="arrowUp" size={17} className="onboardingArrow" />
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Paso 2 de 2</p>
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
              {SUBJECTS.filter((subject) => subject !== 'general').map((subject) => (
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
              ))}
            </div>

            <label className="fieldLabel" htmlFor="onboarding-exam">
              Fecha de examen <span className="fieldOptional">(opcional)</span>
            </label>
            <input
              id="onboarding-exam"
              type="date"
              className="textInput"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
            />

            {error ? (
              <p className="inlineError" role="alert">
                <Icon name="alert" size={16} />
                <span>{error}</span>
              </p>
            ) : null}
            <div className="onboardingActions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setStep(0)}
              >
                Atrás
              </button>
              <button
                type="button"
                className="button primary"
                onClick={finish}
              >
                Entrar a Cope
              </button>
            </div>
          </>
        )}

        <p className="onboardingPrivacy">
          <Icon name="shield" size={14} />
          Sin registro. Cope guarda tu perfil, historial y progreso localmente.
        </p>
      </section>
    </main>
  );
}
