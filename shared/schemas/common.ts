import { z } from 'zod';

export const MODES = ['assistant', 'tutor'] as const;
export const SUBJECTS = ['math', 'physics', 'chemistry', 'general'] as const;
export const LEVELS = ['primaria', 'secundaria', 'bachillerato', 'universidad'] as const;

export const modeSchema = z.enum(MODES);
export const subjectSchema = z.enum(SUBJECTS);
export const levelSchema = z.enum(LEVELS);

export type Mode = z.infer<typeof modeSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Level = z.infer<typeof levelSchema>;
