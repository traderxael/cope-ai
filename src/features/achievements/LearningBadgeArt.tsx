import type { LearningBadgeIcon } from '../../lib/learningBadges';
import spacedRepetition from './art/spaced-repetition.png';
import activeRecall from './art/active-recall.png';
import feynman from './art/feynman.png';
import pomodoro from './art/pomodoro.png';
import newton from './art/newton.png';
import pythagoras from './art/pythagoras.png';

const LEARNING_IMAGES: Record<LearningBadgeIcon, string> = {
  'spaced-repetition': spacedRepetition,
  'active-recall': activeRecall,
  feynman,
  pomodoro,
  newton,
  pythagoras,
};

/** Render 3D propio para cada insignia-concepto (decorativo). */
export function LearningBadgeArt({ icon }: { icon: LearningBadgeIcon }) {
  return <img src={LEARNING_IMAGES[icon]} alt="" draggable={false} />;
}
