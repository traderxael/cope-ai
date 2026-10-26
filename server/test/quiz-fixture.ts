import type { QuizQuestion } from '../../shared/types';

export function makeQuestions(count = 5): QuizQuestion[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: `Pregunta de prueba número ${index + 1}`,
    options: ['Alfa', 'Beta', 'Gamma', 'Delta'],
    correctIndex: (index % 4) as 0 | 1 | 2 | 3,
    explanation: `Explicación de la pregunta ${index + 1}.`,
  }));
}
