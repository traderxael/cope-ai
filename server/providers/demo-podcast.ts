import { LEVEL_LABELS, SUBJECT_LABELS } from '../../shared/types.js';
import type {
  PodcastContent,
  PodcastRequest,
} from '../../shared/schemas/podcast.js';

export function demoPodcast(request: PodcastRequest): PodcastContent {
  const topic = request.topic?.trim() || SUBJECT_LABELS[request.subject];
  const level = LEVEL_LABELS[request.level];
  return {
    title: `Podcast de ${topic}`,
    script: [
      `Hola, soy Cope. Hoy vamos a repasar ${topic} para ${level.toLowerCase()}, en un episodio corto para escuchar mientras estudiás o descansás.`,
      `La idea central es simple: antes de memorizar, entendé qué problema resuelve el tema. Cuando podés explicarlo con tus palabras, ya no dependés de la memoria.`,
      `Tomemos un ejemplo cotidiano. Si estás aprendiendo una fórmula, primero identificá qué datos tenés y qué querés averiguar. Después elegí el camino y recién al final hacé las cuentas.`,
      `Para cerrar, probá esto: contale el tema a alguien en un minuto, sin mirar apuntes. La parte que se traba es la que conviene repasar. Nos escuchamos en el próximo episodio.`,
    ].join('\n\n'),
  };
}
