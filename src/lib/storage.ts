import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_TUTOR,
  type Difficulty,
  type Level,
  type Mode,
  type PlanTaskType,
  type QuizQuestion,
  type Subject,
  type TutorConfig,
} from '../../shared/types';
import type { SrsFields } from './srs';

export interface StoredAttachment {
  id: string;
  kind: 'image' | 'pdf';
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
  text?: string;
  truncated?: boolean;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: StoredAttachment[];
  createdAt: number;
  demo?: boolean;
  stopped?: boolean;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  mode: Mode;
  tutor: TutorConfig;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface PracticeResult {
  id: string;
  conversationId?: string;
  subject: Subject;
  level: Level;
  difficulty: Difficulty;
  topic?: string;
  questionCount: number;
  timed: boolean;
  durationSeconds: number;
  startedAt: number;
  completedAt: number;
  score: number;
  questions: QuizQuestion[];
  answers: Array<number | null>;
}

export interface Flashcard extends SrsFields {
  id: string;
  front: string;
  back: string;
  explanation?: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: Subject;
  level: Level;
  topic?: string;
  sourceName?: string;
  cards: Flashcard[];
  createdAt: number;
  updatedAt: number;
}

export interface StudyPlanTask {
  id: string;
  title: string;
  description?: string;
  minutes: number;
  type: PlanTaskType;
  completed: boolean;
}

export interface StudyPlanDay {
  day: number;
  focus: string;
  tasks: StudyPlanTask[];
}

export interface StudyPlan {
  id: string;
  title: string;
  subject: Subject;
  level: Level;
  examDate: string;
  topics: string[];
  days: StudyPlanDay[];
  createdAt: number;
  updatedAt: number;
}

interface CopeDatabase extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updated': number };
  };
  practiceResults: {
    key: string;
    value: PracticeResult;
    indexes: { 'by-completed': number; 'by-subject': string };
  };
  flashcardDecks: {
    key: string;
    value: FlashcardDeck;
    indexes: { 'by-updated': number };
  };
  studyPlans: {
    key: string;
    value: StudyPlan;
    indexes: { 'by-created': number };
  };
}

const DB_NAME = 'cope-ai';
const DB_VERSION = 2;

let databasePromise: Promise<IDBPDatabase<CopeDatabase>> | null = null;
let persistenceRequested = false;

function normalizeTutor(tutor: TutorConfig | undefined): TutorConfig {
  return {
    ...DEFAULT_TUTOR,
    ...(tutor ?? {}),
    style: tutor?.style ?? DEFAULT_TUTOR.style,
  };
}

function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    tutor: normalizeTutor(conversation.tutor),
  };
}

function database() {
  if (!databasePromise) {
    databasePromise = openDB<CopeDatabase>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('conversations')) {
          const store = db.createObjectStore('conversations', {
            keyPath: 'id',
          });
          store.createIndex('by-updated', 'updatedAt');
        }

        if (!db.objectStoreNames.contains('practiceResults')) {
          const store = db.createObjectStore('practiceResults', {
            keyPath: 'id',
          });
          store.createIndex('by-completed', 'completedAt');
          store.createIndex('by-subject', 'subject');
        }

        if (!db.objectStoreNames.contains('flashcardDecks')) {
          const store = db.createObjectStore('flashcardDecks', {
            keyPath: 'id',
          });
          store.createIndex('by-updated', 'updatedAt');
        }

        if (!db.objectStoreNames.contains('studyPlans')) {
          const store = db.createObjectStore('studyPlans', {
            keyPath: 'id',
          });
          store.createIndex('by-created', 'createdAt');
        }

        if (
          oldVersion > 0 &&
          oldVersion < 2 &&
          transaction.objectStoreNames.contains('conversations')
        ) {
          void (async () => {
            const store = transaction.objectStore('conversations');
            let cursor = await store.openCursor();
            while (cursor) {
              const value = cursor.value as Conversation;
              if (!value.tutor?.style) {
                await cursor.update({
                  ...value,
                  tutor: normalizeTutor(value.tutor),
                });
              }
              cursor = await cursor.continue();
            }
          })();
        }
      },
    });
  }
  return databasePromise;
}

export async function requestStoragePersistence(): Promise<boolean> {
  if (persistenceRequested) return true;
  persistenceRequested = true;
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
      return false;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeConversation(
  mode: Mode = 'assistant',
  tutor: TutorConfig = DEFAULT_TUTOR,
): Conversation {
  const now = Date.now();
  return {
    id: newId(),
    title: 'Nueva conversación',
    mode,
    tutor: normalizeTutor(tutor),
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function titleFromContent(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Nueva conversación';
  return clean.length > 52 ? `${clean.slice(0, 51)}…` : clean;
}

export function sortConversations(
  conversations: Conversation[],
): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listConversations(): Promise<Conversation[]> {
  const db = await database();
  const all = await db.getAllFromIndex('conversations', 'by-updated');
  return all.reverse().map(normalizeConversation);
}

export async function getConversation(
  id: string,
): Promise<Conversation | undefined> {
  const db = await database();
  const conversation = await db.get('conversations', id);
  return conversation ? normalizeConversation(conversation) : undefined;
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  const db = await database();
  const transaction = db.transaction('conversations', 'readwrite');
  await transaction.store.put(normalizeConversation(conversation));
  await transaction.done;
  void requestStoragePersistence();
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction('conversations', 'readwrite');
  await transaction.store.delete(id);
  await transaction.done;
}

export async function clearConversations(): Promise<void> {
  const db = await database();
  const transaction = db.transaction('conversations', 'readwrite');
  await transaction.store.clear();
  await transaction.done;
}

export async function clearAllData(): Promise<void> {
  const db = await database();
  const transaction = db.transaction(
    ['conversations', 'practiceResults', 'flashcardDecks', 'studyPlans'],
    'readwrite',
  );
  await transaction.objectStore('conversations').clear();
  await transaction.objectStore('practiceResults').clear();
  await transaction.objectStore('flashcardDecks').clear();
  await transaction.objectStore('studyPlans').clear();
  await transaction.done;
}

export async function storageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  } catch {
    return null;
  }
}

export async function savePracticeResult(
  result: PracticeResult,
): Promise<void> {
  const db = await database();
  const transaction = db.transaction('practiceResults', 'readwrite');
  await transaction.store.put(result);
  await transaction.done;
  void requestStoragePersistence();
}

export async function listPracticeResults(): Promise<PracticeResult[]> {
  const db = await database();
  const all = await db.getAllFromIndex('practiceResults', 'by-completed');
  return all.reverse();
}

export async function saveFlashcardDeck(
  deck: FlashcardDeck,
): Promise<void> {
  const db = await database();
  const transaction = db.transaction('flashcardDecks', 'readwrite');
  await transaction.store.put(deck);
  await transaction.done;
  void requestStoragePersistence();
}

export async function listFlashcardDecks(): Promise<FlashcardDeck[]> {
  const db = await database();
  const all = await db.getAllFromIndex('flashcardDecks', 'by-updated');
  return all.reverse();
}

export async function deleteFlashcardDeck(id: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction('flashcardDecks', 'readwrite');
  await transaction.store.delete(id);
  await transaction.done;
}

export async function saveStudyPlan(plan: StudyPlan): Promise<void> {
  const db = await database();
  const transaction = db.transaction('studyPlans', 'readwrite');
  await transaction.store.put(plan);
  await transaction.done;
  void requestStoragePersistence();
}

export async function listStudyPlans(): Promise<StudyPlan[]> {
  const db = await database();
  const all = await db.getAllFromIndex('studyPlans', 'by-created');
  return all.reverse();
}

export async function deleteStudyPlan(id: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction('studyPlans', 'readwrite');
  await transaction.store.delete(id);
  await transaction.done;
}
