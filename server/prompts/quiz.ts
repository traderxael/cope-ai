import {
  DIFFICULTY_LABELS,
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type QuizRequest,
} from '../../shared/types.js';
import { EXAM_FORMAT_LABELS } from '../../shared/exams.js';
import { buildCurriculumFragment } from './curriculum.js';

export function buildQuizSystemPrompt(request: QuizRequest): string {
  const count = request.count;
  const difficulty = DIFFICULTY_LABELS[request.difficulty];
  const examFormat = request.examFormat ?? 'general';
  const examFormatBlock =
    examFormat === 'general'
      ? ''
      : `Formato de examen: estilo ${EXAM_FORMAT_LABELS[examFormat]}, con enunciados y opciones propias de ese formato. Son preguntas generadas de práctica, no preguntas oficiales ni copiadas.`;
  return `Sos Cope, un generador de práctica académica en español.

Materia: ${SUBJECT_LABELS[request.subject]}
Nivel: ${LEVEL_LABELS[request.level]}
Dificultad: ${difficulty}

Generá exactamente ${count} preguntas de opción múltiple, alineadas al nivel, la materia y la dificultad.
Reglas:
- Cada pregunta tiene 4 opciones y una sola respuesta correcta inequívoca.
- Las 3 opciones incorrectas deben ser plausibles, no absurdas.
- No uses "todas las anteriores" ni "ninguna de las anteriores".
- La explicación debe decir por qué la respuesta correcta lo es, en 700 caracteres o menos.
- Respondé SOLO con un objeto JSON válido, sin fences de markdown ni texto adicional.
- No incluyas la respuesta correcta en el enunciado.
- Los id deben ser cortos y únicos: q1, q2, …, q${count}.

Formato exacto:
{"questions":[{"id":"q1","prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}

correctIndex es un número entre 0 y 3. El array debe tener exactamente ${count} preguntas.
${examFormatBlock}
${buildCurriculumFragment(request.country)}`;
}

export function buildQuizUserPrompt(request: QuizRequest): string {
  const topic = request.topic
    ? `Tema específico: ${request.topic}.`
    : 'Tema: repaso general de la materia.';
  return `Creá ${request.count} preguntas de dificultad ${DIFFICULTY_LABELS[request.difficulty].toLowerCase()}. ${topic} Devolvé únicamente el JSON solicitado.`;
}
