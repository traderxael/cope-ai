import {
  listConversations,
  listFlashcardDecks,
  listOralExams,
  listPracticeResults,
  listStudyPlans,
  saveConversation,
  type Conversation,
  type FlashcardDeck,
  type OralExamSession,
  type PracticeResult,
  type StudyPlan,
} from './storage';

export const BACKUP_APP = 'cope-ai';
export const BACKUP_VERSION = 1;

export interface BackupData {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  conversations: Conversation[];
  practices: PracticeResult[];
  decks: FlashcardDeck[];
  plans: StudyPlan[];
  oralExams: OralExamSession[];
}

export async function buildBackup(): Promise<BackupData> {
  const [conversations, practices, decks, plans, oralExams] =
    await Promise.all([
      listConversations(),
      listPracticeResults(),
      listFlashcardDecks(),
      listStudyPlans(),
      listOralExams(),
    ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    conversations,
    practices,
    decks,
    plans,
    oralExams,
  };
}

export function backupFileName(date = new Date()): string {
  return `cope-respaldo-${date.toISOString().slice(0, 10)}.json`;
}

export interface RestoreResult {
  restored: number;
  skipped: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAttachment(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.kind === 'image' || value.kind === 'pdf' || value.kind === 'text') &&
    typeof value.mime === 'string' &&
    typeof value.size === 'number' &&
    (value.text === undefined || typeof value.text === 'string') &&
    (value.dataUrl === undefined || typeof value.dataUrl === 'string')
  );
}

function isMessage(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'number' &&
    (value.attachments === undefined ||
      (Array.isArray(value.attachments) &&
        value.attachments.every(isAttachment)))
  );
}

function isConversation(value: unknown): value is Conversation {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    (value.mode !== 'assistant' && value.mode !== 'tutor') ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    !Array.isArray(value.messages) ||
    !value.messages.every(isMessage) ||
    !isRecord(value.tutor)
  ) {
    return false;
  }
  return (
    typeof value.tutor.subject === 'string' &&
    typeof value.tutor.level === 'string' &&
    typeof value.tutor.style === 'string'
  );
}

export async function restoreConversations(
  raw: string,
): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (
    !isRecord(parsed) ||
    parsed.app !== BACKUP_APP ||
    parsed.version !== BACKUP_VERSION ||
    !Array.isArray(parsed.conversations)
  ) {
    throw new Error('El archivo no es un respaldo válido de Cope AI.');
  }

  let restored = 0;
  let skipped = 0;
  for (const item of parsed.conversations) {
    if (!isConversation(item)) {
      skipped += 1;
      continue;
    }
    try {
      await saveConversation(item);
      restored += 1;
    } catch {
      skipped += 1;
    }
  }
  if (restored === 0 && skipped > 0) {
    throw new Error('El respaldo no tiene conversaciones válidas.');
  }
  return { restored, skipped };
}

export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
