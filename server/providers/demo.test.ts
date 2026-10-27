import { describe, expect, it } from 'vitest';
import { quizContentSchema } from '../../shared/schemas/quiz';
import type { ChatMessage, Subject } from '../../shared/types';
import { buildDemoAnswer, demoQuiz, streamDemoChat } from './demo';

const ALL_SUBJECTS: Subject[] = ['math', 'physics', 'chemistry', 'general'];

const messages: ChatMessage[] = [
  { role: 'user', content: 'Explícame las derivadas con un ejemplo' },
];

describe('demoQuiz', () => {
  it('devuelve cinco preguntas válidas por materia', () => {
    for (const subject of ALL_SUBJECTS) {
      const parsed = quizContentSchema.safeParse({ questions: demoQuiz(subject) });
      expect(parsed.success, subject).toBe(true);
    }
  });

  it('usa ids únicos y devuelve copias independientes', () => {
    const first = demoQuiz('math');
    expect(new Set(first.map((question) => question.id)).size).toBe(5);
    first[0]!.options[0] = 'Cambiada';
    expect(demoQuiz('math')[0]!.options[0]).not.toBe('Cambiada');
  });

  it('puede devolver diez preguntas válidas', () => {
    for (const subject of ALL_SUBJECTS) {
      const questions = demoQuiz(subject, 10);
      expect(questions).toHaveLength(10);
      expect(quizContentSchema.safeParse({ questions }).success, subject).toBe(
        true,
      );
    }
  });
});

describe('buildDemoAnswer', () => {
  it('el tutor muestra materia, nivel y una fórmula', () => {
    const answer = buildDemoAnswer({
      mode: 'tutor',
      tutor: { subject: 'math', level: 'secundaria', style: 'guided' },
      messages,
      hasImages: false,
      hasDocument: false,
    });
    expect(answer).toContain('modo demo');
    expect(answer).toContain('Matemáticas');
    expect(answer).toContain('Secundaria');
    expect(answer).toContain('$$');
    expect(answer).toContain('derivadas');
  });

  it('el asistente incluye markdown y un bloque de código', () => {
    const answer = buildDemoAnswer({
      mode: 'assistant',
      tutor: { subject: 'general', level: 'secundaria', style: 'guided' },
      messages,
      hasImages: true,
      hasDocument: true,
    });
    expect(answer).toContain('```ts');
    expect(answer).toContain('Recibí una imagen');
    expect(answer).toContain('Recibí un documento');
  });
});

describe('streamDemoChat', () => {
  it('emite la respuesta completa en fragmentos', async () => {
    const answer = 'Hola, esto es una prueba de streaming.';
    const chunks: string[] = [];
    for await (const chunk of streamDemoChat(answer, { delayMs: 0 })) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe(answer);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('aborta antes de empezar', async () => {
    const controller = new AbortController();
    controller.abort();
    const iterate = async () => {
      for await (const _chunk of streamDemoChat('texto de prueba', {
        delayMs: 0,
        signal: controller.signal,
      })) {
        // consumir
      }
    };
    await expect(iterate()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborta durante el streaming', async () => {
    const controller = new AbortController();
    const iterate = async () => {
      let received = 0;
      for await (const _chunk of streamDemoChat(
        'una respuesta suficientemente larga para varios fragmentos',
        { delayMs: 5, signal: controller.signal },
      )) {
        received += 1;
        if (received === 1) controller.abort();
      }
    };
    await expect(iterate()).rejects.toMatchObject({ name: 'AbortError' });
  });
});
