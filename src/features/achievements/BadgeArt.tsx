import type { BadgeIcon } from '../../lib/achievements';
import rocket from './art/rocket.png';
import earth from './art/earth.png';
import moon from './art/moon.png';
import mars from './art/mars.png';
import jupiter from './art/jupiter.png';
import sun from './art/sun.png';
import asteroid from './art/asteroid.png';
import comet from './art/comet.png';
import nebula from './art/nebula.png';
import galaxy from './art/galaxy.png';
import supernova from './art/supernova.png';
import universe from './art/universe.png';

interface BadgeArtProps {
  icon: BadgeIcon;
}

const BADGE_IMAGES: Record<BadgeIcon, string> = {
  rocket,
  earth,
  moon,
  mars,
  jupiter,
  sun,
  asteroid,
  comet,
  nebula,
  galaxy,
  supernova,
  universe,
};

/**
 * Renders 3D propios (Blender/Cycles) para cada insignia. La imagen es
 * decorativa: el texto de la tarjeta ya nombra la insignia.
 */
export function BadgeArt({ icon }: BadgeArtProps) {
  return <img src={BADGE_IMAGES[icon]} alt="" draggable={false} />;
}
