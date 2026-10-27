import { z } from 'zod';

export const MODES = ['assistant', 'tutor'] as const;
export const SUBJECTS = ['math', 'physics', 'chemistry', 'general'] as const;
export const LEVELS = ['primaria', 'secundaria', 'bachillerato', 'universidad'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const STUDY_STYLES = ['guided', 'solver'] as const;

export const modeSchema = z.enum(MODES);
export const subjectSchema = z.enum(SUBJECTS);
export const levelSchema = z.enum(LEVELS);
export const difficultySchema = z.enum(DIFFICULTIES);
export const studyStyleSchema = z.enum(STUDY_STYLES);

export type Mode = z.infer<typeof modeSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Level = z.infer<typeof levelSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type StudyStyle = z.infer<typeof studyStyleSchema>;
