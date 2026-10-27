import { oralOverallScore, oralZoneForScore } from '../../shared/oral-grade.js';
import type {
  OralExamConfig,
  OralExamResponse,
  OralGradeResponse,
  OralQuestion,
} from '../../shared/types.js';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
} from '../../shared/types.js';
import { demoQuiz } from './demo.js';

const STOPWORDS = new Set([
  'para',
  'porque',
  'como',
  'cuando',
  'donde',
  'desde',
  'entre',
  'sobre',
  'este',
  'esta',
  'estos',
  'estas',
  'hacia',
  'hasta',
  'según',
  'también',
  'puede',
  'solo',
  'más',
  'menos',
  'cada',
  'toda',
  'todo',
]);

function normalized(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): Set<string> {
  return new Set(
    normalized(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word)),
  );
}

function pointCovered(
  point: string,
  answer: string,
  answerWords: Set<string>,
): boolean {
  const cleanPoint = normalized(point);
  if (cleanPoint.length >= 3 && answer.includes(cleanPoint)) return true;
  return [...words(point)].some((word) => answerWords.has(word));
}

function scoreAnswer(question: OralQuestion, answer: string): number {
  const clean = answer.trim();
  if (!clean) return 0;
  if (clean.length < 12) return 1;

  const normalizedAnswer = normalized(clean);
  const answerWords = words(clean);
  const matched = question.expectedPoints.filter((point) =>
    pointCovered(point, normalizedAnswer, answerWords),
  ).length;
  let score = 1 + Math.min(3, matched);
  if (matched >= 2) score = 5;
  else if (answerWords.size >= 25) score += 1;
  if (clean.length < 20) score = Math.min(score, 2);
  return Math.max(0, Math.min(5, score));
}

function feedbackFor(
  question: OralQuestion,
  answer: string,
  score: number,
): { strengths: string[]; improvements: string[] } {
  const clean = answer.trim();
  if (!clean) {
    return {
      strengths: [],
      improvements: ['La pregunta quedó sin responder. Empezá por definir el concepto.'],
    };
  }
  const normalizedAnswer = normalized(clean);
  const answerWords = words(clean);
  const covered = question.expectedPoints.filter((point) =>
    pointCovered(point, normalizedAnswer, answerWords),
  );
  const missing = question.expectedPoints.filter(
    (point) => !pointCovered(point, normalizedAnswer, answerWords),
  );
  const strengths = covered.length
    ? [`Mencionaste: ${covered[0]}`]
    : ['Respondiste dentro del tema.'];
  const improvements = missing.length
    ? missing.slice(0, 2).map((point) => `Profundizá en: ${point}`)
    : score >= 5
      ? ['Mantené este nivel y agregá un ejemplo propio.']
      : ['Agregá un ejemplo concreto para cerrar la idea.'];
  return { strengths, improvements };
}

export function demoOralExam(config: OralExamConfig): OralExamResponse {
  const quiz = demoQuiz(config.subject, config.count);
  const questions: OralQuestion[] = quiz.map((question, index) => ({
    id: `q${index + 1}`,
    prompt: question.prompt,
    expectedPoints: question.options[question.correctIndex]
      ? [question.options[question.correctIndex], question.explanation]
      : [question.explanation],
    rubric:
      'Explicá el concepto con tus palabras, justificá la respuesta y mencioná un ejemplo.',
  }));
  return {
    title: `Simulacro oral de ${SUBJECT_LABELS[config.subject]} (${LEVEL_LABELS[config.level]})`,
    questions,
    demo: true,
  };
}

export function demoOralGrade(
  config: OralExamConfig,
  questions: OralQuestion[],
  answers: Array<{ questionId: string; answer: string }>,
): OralGradeResponse {
  const answerById = new Map(
    answers.map((answer) => [answer.questionId, answer.answer]),
  );
  const results = questions.map((question) => {
    const answer = answerById.get(question.id) ?? '';
    const score = scoreAnswer(question, answer);
    const feedback = feedbackFor(question, answer, score);
    return {
      questionId: question.id,
      score,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      modelAnswer: question.expectedPoints.join(' '),
    };
  });
  const overallScore = oralOverallScore(results.map((result) => result.score));
  const zone = oralZoneForScore(overallScore);
  const summary =
    zone === 'segura'
      ? `Tu examen oral de ${SUBJECT_LABELS[config.subject]} muestra una base sólida. Sostené la precisión y agregá ejemplos propios.`
      : zone === 'practica'
        ? `Vas por buen camino en ${SUBJECT_LABELS[config.subject]}, pero varias respuestas necesitan más desarrollo y justificación.`
        : `Todavía hay conceptos centrales para reforzar en ${SUBJECT_LABELS[config.subject]}. Empezá por las preguntas con menor puntaje.`;
  return {
    results,
    overallScore,
    zone,
    summary,
    nextSteps:
      zone === 'segura'
        ? ['Repetir el simulacro con otra dificultad', 'Grabar una respuesta y compararla con la rúbrica']
        : ['Repasar los puntos débiles y volver a explicarlos en voz alta', 'Hacer una práctica corta por tema'],
    demo: true,
  };
}
