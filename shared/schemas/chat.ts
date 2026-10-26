import { z } from 'zod';
import { LIMITS } from '../limits';
import { levelSchema, modeSchema, subjectSchema } from './common';

const IMAGE_DATA_URL =
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(LIMITS.maxTextPerMessage),
});

export const imagePartSchema = z.object({
  type: z.literal('image_url'),
  image_url: z.object({
    url: z
      .string()
      .max(LIMITS.maxImageDataUrlChars)
      .regex(IMAGE_DATA_URL, 'La imagen debe ser un data URL png, jpeg o webp.'),
  }),
});

export const contentPartSchema = z.discriminatedUnion('type', [
  textPartSchema,
  imagePartSchema,
]);

export const chatMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.union([
      z.string().trim().min(1).max(LIMITS.maxTextPerMessage),
      z
        .array(contentPartSchema)
        .min(1)
        .max(LIMITS.maxPartsPerMessage),
    ]),
  })
  .superRefine((message, ctx) => {
    if (typeof message.content === 'string') return;
    const text = message.content
      .filter((part): part is z.infer<typeof textPartSchema> => part.type === 'text')
      .map((part) => part.text)
      .join('');
    if (text.length > LIMITS.maxTextPerMessage) {
      ctx.addIssue({
        code: 'custom',
        message: `El texto de un mensaje supera ${LIMITS.maxTextPerMessage} caracteres.`,
      });
    }
    const images = message.content.filter((part) => part.type === 'image_url');
    if (images.length > LIMITS.maxImages) {
      ctx.addIssue({
        code: 'custom',
        message: `Se permiten como máximo ${LIMITS.maxImages} imágenes.`,
      });
    }
  });

export const tutorConfigSchema = z.object({
  subject: subjectSchema,
  level: levelSchema,
});

export const chatRequestSchema = z
  .object({
    mode: modeSchema,
    messages: z.array(chatMessageSchema).min(1).max(LIMITS.maxMessages),
    tutor: tutorConfigSchema.optional(),
  })
  .superRefine((request, ctx) => {
    if (request.mode === 'tutor' && !request.tutor) {
      ctx.addIssue({
        code: 'custom',
        path: ['tutor'],
        message: 'El modo tutor necesita materia y nivel.',
      });
    }

    let totalText = 0;
    let totalImages = 0;
    for (const message of request.messages) {
      if (typeof message.content === 'string') {
        totalText += message.content.length;
        continue;
      }
      for (const part of message.content) {
        if (part.type === 'text') totalText += part.text.length;
        else totalImages += 1;
      }
    }
    if (totalText > LIMITS.maxTotalText) {
      ctx.addIssue({
        code: 'custom',
        message: `La conversación supera ${LIMITS.maxTotalText} caracteres.`,
      });
    }
    if (totalImages > LIMITS.maxImages) {
      ctx.addIssue({
        code: 'custom',
        message: `La conversación admite como máximo ${LIMITS.maxImages} imágenes.`,
      });
    }
  });

export type TextPart = z.infer<typeof textPartSchema>;
export type ImagePart = z.infer<typeof imagePartSchema>;
export type ContentPart = z.infer<typeof contentPartSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type TutorConfig = z.infer<typeof tutorConfigSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
