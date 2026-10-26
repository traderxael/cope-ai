import { openDB, type DBSchema } from 'idb';
import {
  DEFAULT_TUTOR,
  type Level,
  type Mode,
  type Subject,
  type TutorConfig,
} from '../../shared/types';

export interface StoredAttachment {
  id: string;
  kind: 'image' | 'pdf';
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
  text?: string;
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

interface CopeDatabase extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updated': number };
  };
}

const DB_NAME = 'cope-ai';
const DB_VERSION = 1;

let databasePromise: ReturnType<typeof openDB<CopeDatabase>> | null = null;

function database() {
  if (!databasePromise) {
    databasePromise = openDB<CopeDatabase>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return databasePromise;
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
    tutor: { ...tutor },
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
  return all.reverse();
}

export async function getConversation(
  id: string,
): Promise<Conversation | undefined> {
  const db = await database();
  return db.get('conversations', id);
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  const db = await database();
  const transaction = db.transaction('conversations', 'readwrite');
  await transaction.store.put(conversation);
  await transaction.done;
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

export async function storageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (!navigator.storage?.estimate) return null;
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

export function updateConversationTutor(
  conversation: Conversation,
  tutor: { subject: Subject; level: Level },
): Conversation {
  return {
    ...conversation,
    tutor: { ...tutor },
    updatedAt: Date.now(),
  };
}
