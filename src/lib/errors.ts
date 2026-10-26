export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentError';
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError';
  return error instanceof Error && error.name === 'AbortError';
}
