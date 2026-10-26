import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type QuizRequest,
} from '../../shared/types';

export function buildQuizSystemPrompt(request: QuizRequest): string {
  return `Sos Cope, un generador de práctica académica en español.

Materia: ${SUBJECT_LABELS[request.subject]}
Nivel: ${LEVEL_LABELS[request.level]}

Generá exactamente 5 preguntas de opción múltiple, alineadas al nivel y a la materia.
Reglas:
- Cada pregunta tiene 4 opciones y una sola respuesta correcta inequívoca.
- Las 3 opciones incorrectas deben ser plausibles, no absurdas.
- No uses "todas las anteriores" ni "ninguna de las anteriores".
- La explicación debe decir por qué la respuesta correcta lo es, en 700 caracteres o menos.
- Respondé SOLO con un objeto JSON válido, sin fences de markdown ni texto adicional.
- No incluyas la respuesta correcta en el enunciado.
- Los id deben ser cortos y únicos (q1, q2, q3, q4, q5).

Formato exacto:
{"questions":[{"id":"q1","prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}

correctIndex es un número entre 0 y 3.`;
}

export function buildQuizUserPrompt(request: QuizRequest): string {
  const topic = request.topic
    ? `Tema específico: ${request.topic}.`
    : 'Tema: repaso general de la materia.';
  return `Creá la práctica ahora. ${topic} Devolvé únicamente el JSON solicitado.`;
}
