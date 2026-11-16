import { Dialog } from '../../components/Dialog';
import type { LearningBadge } from '../../lib/learningBadges';
import { LearningBadgeArt } from './LearningBadgeArt';

interface LearningConceptDialogProps {
  badge: LearningBadge | null;
  open: boolean;
  onClose: () => void;
}

/** Muestra el concepto que enseña una insignia al desbloquearla. */
export function LearningConceptDialog({
  badge,
  open,
  onClose,
}: LearningConceptDialogProps) {
  if (!badge) return null;
  const { concept } = badge;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Concepto desbloqueado"
      description={badge.label}
      className="progressDialog learningConceptDialog"
    >
      <div className="learningConceptHero">
        <span className="badgeArt" aria-hidden="true">
          <LearningBadgeArt icon={badge.icon} />
        </span>
        <div>
          <h3>{concept.title}</h3>
          <p className="learningConceptState">
            {badge.unlocked
              ? `Insignia desbloqueada · ${badge.current}/${badge.target}`
              : `${badge.current}/${badge.target} · te falta ${badge.target - badge.current}`}
          </p>
        </div>
      </div>

      {badge.unlocked ? (
        <>
          <section className="progressSection" aria-labelledby="concept-explanation">
            <h3 id="concept-explanation">Cómo funciona</h3>
            <p className="learningConceptText">{concept.explanation}</p>
          </section>
          <section className="progressSection" aria-labelledby="concept-application">
            <h3 id="concept-application">Cómo usarlo en Cope</h3>
            <p className="learningConceptText">{concept.application}</p>
          </section>
        </>
      ) : (
        <section className="progressSection" aria-labelledby="concept-locked">
          <h3 id="concept-locked">Sigue así</h3>
          <p className="learningConceptText">
            Desbloqueá completando {badge.target - badge.current} actividades relacionadas.
          </p>
        </section>
      )}
    </Dialog>
  );
}
