import {
  listConversations,
  listFlashcardDecks,
  listOralExams,
  listPracticeResults,
  listStudyPlans,
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
