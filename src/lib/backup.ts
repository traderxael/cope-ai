import {
  listConversations,
  listFlashcardDecks,
  listOralExams,
  listPracticeResults,
  listStudyPlans,
  saveConversation,
  saveFlashcardDeck,
  saveOralExam,
  savePracticeResult,
  saveStudyPlan,
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
  conversations: number;
  practices: number;
  decks: number;
  plans: number;
  oralExams: number;
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

function isPractice(value: unknown): value is PracticeResult {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.subject === 'string' &&
    typeof value.level === 'string' &&
    typeof value.difficulty === 'string' &&
    typeof value.questionCount === 'number' &&
    typeof value.timed === 'boolean' &&
    typeof value.durationSeconds === 'number' &&
    typeof value.startedAt === 'number' &&
    typeof value.completedAt === 'number' &&
    typeof value.score === 'number' &&
    Array.isArray(value.questions) &&
    Array.isArray(value.answers)
  );
}

function isDeck(value: unknown): value is FlashcardDeck {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.subject === 'string' &&
    typeof value.level === 'string' &&
    Array.isArray(value.cards) &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

function isPlan(value: unknown): value is StudyPlan {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.subject === 'string' &&
    typeof value.level === 'string' &&
    typeof value.examDate === 'string' &&
    Array.isArray(value.topics) &&
    Array.isArray(value.days) &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

function isOralExam(value: unknown): value is OralExamSession {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isRecord(value.config) &&
    isRecord(value.personality) &&
    Array.isArray(value.questions) &&
    isRecord(value.answers) &&
    (value.status === 'in_progress' || value.status === 'graded') &&
    typeof value.startedAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function restoreCollection<T>(
  items: unknown[],
  isValid: (value: unknown) => value is T,
  save: (value: T) => Promise<void>,
): Promise<{ restored: number; skipped: number }> {
  let restored = 0;
  let skipped = 0;
  for (const item of items) {
    if (!isValid(item)) {
      skipped += 1;
      continue;
    }
    try {
      await save(item);
      restored += 1;
    } catch {
      skipped += 1;
    }
  }
  return { restored, skipped };
}

export async function restoreBackup(raw: string): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (
    !isRecord(parsed) ||
    parsed.app !== BACKUP_APP ||
    parsed.version !== BACKUP_VERSION
  ) {
    throw new Error('El archivo no es un respaldo válido de Cope AI.');
  }

  const conversations = await restoreCollection(
    asArray(parsed.conversations),
    isConversation,
    saveConversation,
  );
  const practices = await restoreCollection(
    asArray(parsed.practices),
    isPractice,
    savePracticeResult,
  );
  const decks = await restoreCollection(
    asArray(parsed.decks),
    isDeck,
    saveFlashcardDeck,
  );
  const plans = await restoreCollection(
    asArray(parsed.plans),
    isPlan,
    saveStudyPlan,
  );
  const oralExams = await restoreCollection(
    asArray(parsed.oralExams),
    isOralExam,
    saveOralExam,
  );

  const result: RestoreResult = {
    conversations: conversations.restored,
    practices: practices.restored,
    decks: decks.restored,
    plans: plans.restored,
    oralExams: oralExams.restored,
    skipped:
      conversations.skipped +
      practices.skipped +
      decks.skipped +
      plans.skipped +
      oralExams.skipped,
  };
  const restored =
    result.conversations +
    result.practices +
    result.decks +
    result.plans +
    result.oralExams;
  if (restored === 0 && result.skipped > 0) {
    throw new Error('El respaldo no tiene datos válidos.');
  }
  return result;
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
