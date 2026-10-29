import { LEVEL_LABELS, SUBJECT_LABELS } from '../../shared/types.js';
import type { PodcastRequest } from '../../shared/schemas/podcast.js';
import { buildCurriculumFragment } from './curriculum.js';
import { buildLanguageFragment } from './personality.js';

export function buildPodcastSystemPrompt(request: PodcastRequest): string {
  return [
    'Sos un docente que prepara un podcast breve de estudio.',
    'El audio debe sonar natural, cálido y conversado, como una clase explicada en voz alta.',
    'Devolvé únicamente un objeto JSON válido con esta forma:',
    '{"title":"título del episodio","script":"guion completo en un solo texto"}',
    'El guion debe tener entre 250 y 450 palabras, sin markdown, sin listas, sin encabezados y sin acotaciones técnicas.',
    'Incluí una introducción, dos o tres ideas centrales con un ejemplo concreto y un cierre con una pregunta para repasar.',
    buildCurriculumFragment(request.country),
    buildLanguageFragment(request.language),
  ].join('\n');
}

export function buildPodcastUserPrompt(request: PodcastRequest): string {
  const topic = request.topic?.trim() || SUBJECT_LABELS[request.subject];
  return [
    `Materia: ${SUBJECT_LABELS[request.subject]}`,
    `Nivel: ${LEVEL_LABELS[request.level]}`,
    `Tema del episodio: ${topic}`,
    'Escribí el episodio completo para escuchar, no para leer.',
  ].join('\n');
}
