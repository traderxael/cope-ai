import { useCallback, useEffect, useRef, useState } from 'react';
import { chatRequestSchema } from '../../../shared/schemas/chat';
import {
  DEFAULT_TUTOR,
  type ChatRequest,
  type Mode,
  type PersonalityConfig,
  type TutorConfig,
} from '../../../shared/types';
import {
  ApiError,
  fetchHealth,
  requestQuiz,
  streamChat,
  type AiProvider,
  type VoiceCapabilities,
} from '../../lib/api';
import {
  AttachmentError,
  attachmentLimitError,
  prepareAttachment,
} from '../../lib/attachments';
import {
  buildChatRequestWithNotices,
  contextNoticeMessage,
} from '../../lib/chatPayload';
import { isAbortError } from '../../lib/errors';
import { loadCurriculumCountry, curriculumCountryForRequest } from '../../lib/curriculum';
import { loadPersonality, savePersonality } from '../../lib/personality';
import {
  clearAllData,
  deleteConversation as deleteStoredConversation,
  getConversation,
  listConversations,
  makeConversation,
  newId,
  saveConversation,
  savePracticeResult,
  sortConversations,
  titleFromContent,
  type Conversation,
  type PracticeResult,
  type StoredAttachment,
  type StoredMessage,
} from '../../lib/storage';
import {
  type PracticeSession,
  type PracticeSettings,
} from '../study/practice';

export interface ChatAppActions {
  newChat: () => void;
  selectConversation: (id: string) => void;
  sendMessage: (text: string) => boolean;
  stop: () => void;
  retryLast: () => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setMode: (mode: Mode) => void;
  updateTutor: (partial: Partial<TutorConfig>) => void;
  updatePersonality: (personality: PersonalityConfig) => void;
  addFiles: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  dismissAttachmentError: () => void;
  dismissComposerError: () => void;
  dismissStorageError: () => void;
  dismissContextNotice: () => void;
  generatePractice: (settings: PracticeSettings) => Promise<void>;
  recordPracticeResult: (result: PracticeResult) => Promise<boolean>;
  closeQuiz: () => void;
  dismissPracticeError: () => void;
}

export interface ChatAppState {
  loading: boolean;
  conversations: Conversation[];
  active: Conversation | null;
  streaming: boolean;
  streamingId: string | null;
  demo: boolean | null;
  provider: AiProvider | null;
  vision: boolean | null;
  pendingAttachments: StoredAttachment[];
  processing: boolean;
  attachmentError: string | null;
  composerError: string | null;
  practiceLoading: boolean;
  practiceError: string | null;
  quiz: PracticeSession | null;
  personality: PersonalityConfig;
  voice: VoiceCapabilities;
  storageError: string | null;
  contextNotice: string | null;
  actions: ChatAppActions;
}

function upsert(
  conversations: Conversation[],
  conversation: Conversation,
): Conversation[] {
  return sortConversations([
    ...conversations.filter((item) => item.id !== conversation.id),
    conversation,
  ]);
}

const DEMO_MODE_KEY = 'cope-demo-mode-v1';

function loadDemoMode(): boolean | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_MODE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return null;
  } catch {
    return null;
  }
}

function saveDemoMode(value: boolean): void {
  try {
    localStorage.setItem(DEMO_MODE_KEY, value ? '1' : '0');
  } catch {
    // La app sigue funcionando aunque el almacenamiento esté bloqueado.
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof AttachmentError) {
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo completar la operación. Probá de nuevo.';
}

export function useChatApp(): ChatAppState {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActiveState] = useState<Conversation | null>(null);
  const activeRef = useRef<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [demo, setDemo] = useState<boolean | null>(loadDemoMode);
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [vision, setVision] = useState<boolean | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    StoredAttachment[]
  >([]);
  const [processing, setProcessing] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<PracticeSession | null>(null);
  const [personality, setPersonality] =
    useState<PersonalityConfig>(loadPersonality);
  const [voice, setVoice] = useState<VoiceCapabilities>({
    tts: false,
    clone: false,
  });
  const [storageError, setStorageError] = useState<string | null>(null);
  const [contextNotice, setContextNotice] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const quizAbortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const streamConversationRef = useRef<Conversation | null>(null);
  const fullTextRef = useRef('');
  const flushTimerRef = useRef<number | null>(null);
  const deletedIdsRef = useRef(new Set<string>());
  const attachmentGenerationRef = useRef(0);
  const quizGenerationRef = useRef(0);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const applyActive = useCallback((next: Conversation) => {
    activeRef.current = next;
    if (mountedRef.current) setActiveState(next);
  }, []);

  const persistConversation = useCallback(
    (conversation: Conversation): Promise<void> => {
      if (!conversation.messages.length) return Promise.resolve();
      if (deletedIdsRef.current.has(conversation.id)) return Promise.resolve();

      const task = persistQueueRef.current.then(async () => {
        if (deletedIdsRef.current.has(conversation.id)) return;
        try {
          const existing = await getConversation(conversation.id);
          if (existing && existing.updatedAt > conversation.updatedAt) return;
          await saveConversation(conversation);
          if (deletedIdsRef.current.has(conversation.id)) {
            await deleteStoredConversation(conversation.id).catch(
              () => undefined,
            );
            return;
          }
          if (!mountedRef.current) return;
          setConversations((previous) => {
            const existing = previous.find(
              (item) => item.id === conversation.id,
            );
            if (existing && existing.updatedAt > conversation.updatedAt) {
              return previous;
            }
            return upsert(previous, conversation);
          });
        } catch {
          if (mountedRef.current) {
            setStorageError(
              'No se pudo guardar el historial. Revisá el espacio disponible.',
            );
          }
        }
      });

      persistQueueRef.current = task.catch(() => undefined);
      return task;
    },
    [],
  );

  const clearFlushTimer = useCallback(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const flushStream = useCallback(() => {
    const current = streamConversationRef.current;
    const id = streamingIdRef.current;
    if (!current || !id) return;
    const updated: Conversation = {
      ...current,
      messages: current.messages.map((message) =>
        message.id === id
          ? { ...message, content: fullTextRef.current }
          : message,
      ),
      updatedAt: Date.now(),
    };
    streamConversationRef.current = updated;
    if (activeRef.current?.id === updated.id) {
      activeRef.current = updated;
      if (mountedRef.current) setActiveState(updated);
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushStream();
    }, 45);
  }, [flushStream]);

  const finalizeStream = useCallback(
    async (
      conversationId: string,
      assistantId: string,
      outcome: {
        demo?: boolean;
        stopped?: boolean;
        error?: boolean;
        errorMessage?: string;
      },
    ) => {
      clearFlushTimer();
      const snapshot = streamConversationRef.current;

      if (!snapshot || snapshot.id !== conversationId) {
        if (mountedRef.current) {
          setStreaming(false);
          setStreamingId(null);
        }
        abortRef.current = null;
        streamingIdRef.current = null;
        streamConversationRef.current = null;
        return;
      }

      const partial = fullTextRef.current.trim();
      let failed = Boolean(outcome.error);
      let incomplete = false;
      let content: string;
      if (outcome.error) {
        if (partial) {
          content = partial;
          incomplete = true;
          failed = false;
        } else {
          content = outcome.errorMessage ?? 'No se pudo completar la respuesta.';
        }
      } else if (outcome.stopped) {
        content =
          fullTextRef.current.trim() ||
          'La respuesta se detuvo antes de empezar.';
      } else {
        content = fullTextRef.current.trim();
        if (!content) {
          failed = true;
          content = 'La respuesta llegó vacía. Probá de nuevo.';
        }
      }

      const updated: Conversation = {
        ...snapshot,
        messages: snapshot.messages.map((message) => {
          if (message.id !== assistantId) return message;
          const next: StoredMessage = { ...message, content };
          if (outcome.demo !== undefined) next.demo = outcome.demo;
          if (outcome.stopped) next.stopped = true;
          if (failed) next.error = true;
          if (incomplete) next.incomplete = true;
          next.pending = false;
          return next;
        }),
        updatedAt: Date.now(),
      };

      await persistConversation(updated);

      streamConversationRef.current = updated;
      if (activeRef.current?.id === updated.id) {
        activeRef.current = updated;
        if (mountedRef.current) setActiveState(updated);
      }
      if (mountedRef.current) {
        setStreaming(false);
        setStreamingId(null);
      }
      abortRef.current = null;
      streamingIdRef.current = null;
      streamConversationRef.current = null;
      fullTextRef.current = '';
    },
    [clearFlushTimer, persistConversation],
  );

  const startStreaming = useCallback(
    (request: ChatRequest, base: Conversation) => {
      const assistantId = newId();
      const assistant: StoredMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        pending: true,
      };
      const conversation: Conversation = {
        ...base,
        messages: [...base.messages, assistant],
        updatedAt: Date.now(),
      };

      streamConversationRef.current = conversation;
      if (activeRef.current?.id === conversation.id) {
        activeRef.current = conversation;
        if (mountedRef.current) setActiveState(conversation);
      }

      fullTextRef.current = '';
      streamingIdRef.current = assistantId;
      if (mountedRef.current) {
        setStreaming(true);
        setStreamingId(assistantId);
      }

      void persistConversation(conversation);

      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const result = await streamChat(request, {
            signal: controller.signal,
            onDelta: (text) => {
              fullTextRef.current += text;
              scheduleFlush();
            },
          });
          if (mountedRef.current) {
            setDemo(result.demo);
            saveDemoMode(result.demo);
          }
          await finalizeStream(conversation.id, assistantId, {
            demo: result.demo,
          });
        } catch (error) {
          if (controller.signal.aborted || isAbortError(error)) {
            await finalizeStream(conversation.id, assistantId, {
              stopped: true,
            });
            return;
          }
          await finalizeStream(conversation.id, assistantId, {
            error: true,
            errorMessage:
              error instanceof ApiError
                ? error.message
                : 'No se pudo conectar con Cope. Revisá tu conexión e intentá de nuevo.',
          });
        }
      })();
    },
    [finalizeStream, persistConversation, scheduleFlush],
  );

  const resetTransient = useCallback(() => {
    attachmentGenerationRef.current += 1;
    quizGenerationRef.current += 1;
    quizAbortRef.current?.abort();
    quizAbortRef.current = null;
    setPendingAttachments([]);
    setAttachmentError(null);
    setComposerError(null);
    setPracticeError(null);
    setPracticeLoading(false);
    setQuiz(null);
    setProcessing(false);
    setContextNotice(null);
  }, []);

  const newChat = useCallback(() => {
    const current = activeRef.current;
    abortRef.current?.abort();
    resetTransient();

    if (current && current.messages.length === 0) return;

    applyActive(
      makeConversation(
        current?.mode ?? 'assistant',
        current?.tutor ?? DEFAULT_TUTOR,
      ),
    );
  }, [applyActive, resetTransient]);

  const selectConversation = useCallback(
    (id: string) => {
      if (activeRef.current?.id === id) return;
      abortRef.current?.abort();
      resetTransient();
      const found = conversations.find((conversation) => conversation.id === id);
      if (found) applyActive(found);
    },
    [applyActive, conversations, resetTransient],
  );

  const sendMessage = useCallback(
    (text: string): boolean => {
      const current = activeRef.current;
      const trimmed = text.trim();
      if (!current || streaming || processing) return false;
      if (!trimmed && pendingAttachments.length === 0) return false;

      const attachments = pendingAttachments.map((attachment) => ({
        ...attachment,
      }));
      const fallback = attachments.some(
        (attachment) => attachment.kind === 'image',
      )
        ? 'Analizá la imagen adjunta.'
        : 'Analizá el material adjunto.';
      const displayContent = trimmed || fallback;

      if (
        vision === false &&
        attachments.some((attachment) => attachment.kind === 'image')
      ) {
        setComposerError(
          'La IA actual no analiza imágenes. Quitá la imagen y enviá texto o PDF, o configurá un proveedor con visión.',
        );
        return false;
      }

      const userMessage: StoredMessage = {
        id: newId(),
        role: 'user',
        content: displayContent,
        createdAt: Date.now(),
        ...(attachments.length ? { attachments } : {}),
      };

      const next: Conversation = {
        ...current,
        title:
          current.messages.length === 0
            ? titleFromContent(
                trimmed || attachments[0]?.name || 'Nueva consulta',
              )
            : current.title,
        messages: [...current.messages, userMessage],
        updatedAt: Date.now(),
      };

      let request: ChatRequest;
      let nextNotice: string | null;
      try {
        const built = buildChatRequestWithNotices(
          next.mode,
          next.mode === 'tutor' ? next.tutor : undefined,
          next.messages,
          personality,
        );
        nextNotice = contextNoticeMessage(built.notices);
        const parsed = chatRequestSchema.safeParse(built.request);
        if (!parsed.success) {
          setComposerError(
            'El mensaje o la conversación superan el límite permitido.',
          );
          return false;
        }
        const country = loadCurriculumCountry();
        request =
          country === 'general' ? parsed.data : { ...parsed.data, country };
      } catch (error) {
        setComposerError(errorMessage(error));
        return false;
      }

      applyActive(next);
      setPendingAttachments([]);
      setAttachmentError(null);
      setComposerError(null);
      setPracticeError(null);
      setContextNotice(nextNotice);
      attachmentGenerationRef.current += 1;

      void persistConversation(next);
      startStreaming(request, next);
      return true;
    },
    [
      applyActive,
      pendingAttachments,
      persistConversation,
      personality,
      processing,
      startStreaming,
      streaming,
      vision,
    ],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retryLast = useCallback(() => {
    const current = activeRef.current;
    if (!current || streaming) return;

    let lastUserIndex = -1;
    for (let index = current.messages.length - 1; index >= 0; index -= 1) {
      if (current.messages[index]?.role === 'user') {
        lastUserIndex = index;
        break;
      }
    }
    if (lastUserIndex < 0) return;

    const messages = current.messages.slice(0, lastUserIndex + 1);
    if (
      vision === false &&
      messages[lastUserIndex]?.attachments?.some(
        (attachment) => attachment.kind === 'image',
      )
    ) {
      setComposerError(
        'La IA actual no analiza imágenes. Quitá la imagen y enviá texto o PDF, o configurá un proveedor con visión.',
      );
      return;
    }
    const base: Conversation = {
      ...current,
      messages,
      updatedAt: Date.now(),
    };

    let request: ChatRequest;
    let nextNotice: string | null;
    try {
      const built = buildChatRequestWithNotices(
        base.mode,
        base.mode === 'tutor' ? base.tutor : undefined,
        base.messages,
        personality,
      );
      nextNotice = contextNoticeMessage(built.notices);
      const parsed = chatRequestSchema.safeParse(built.request);
      if (!parsed.success) {
        setComposerError(
          'La conversación ya no se puede enviar: supera el límite de contexto.',
        );
        return;
      }
      const country = loadCurriculumCountry();
      request =
        country === 'general' ? parsed.data : { ...parsed.data, country };
    } catch (error) {
      setComposerError(errorMessage(error));
      return;
    }

    applyActive(base);
    setComposerError(null);
    setContextNotice(nextNotice);
    void persistConversation(base);
    startStreaming(request, base);
  }, [
    applyActive,
    persistConversation,
    personality,
    startStreaming,
    streaming,
    vision,
  ]);

  const renameConversation = useCallback(
    (id: string, title: string) => {
      const clean = title.replace(/\s+/g, ' ').trim().slice(0, 90);
      const finalTitle = clean || 'Nueva conversación';
      const current = activeRef.current;
      if (current?.id === id) {
        const next = { ...current, title: finalTitle };
        activeRef.current = next;
        if (streamConversationRef.current?.id === id) {
          streamConversationRef.current = {
            ...streamConversationRef.current,
            title: finalTitle,
          };
        }
        if (mountedRef.current) setActiveState(next);
        if (next.messages.length) void persistConversation(next);
        return;
      }
      const found = conversations.find((conversation) => conversation.id === id);
      if (found) {
        void persistConversation({ ...found, title: finalTitle });
      }
    },
    [conversations, persistConversation],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const deletedActive =
        activeRef.current?.id === id ? activeRef.current : null;
      deletedIdsRef.current.add(id);
      if (deletedActive) {
        abortRef.current?.abort();
        resetTransient();
      }

      try {
        await deleteStoredConversation(id);
      } catch {
        deletedIdsRef.current.delete(id);
        setStorageError('No se pudo borrar la conversación.');
        return;
      }

      const remaining = conversations.filter(
        (conversation) => conversation.id !== id,
      );
      setConversations(remaining);

      if (activeRef.current?.id === id) {
        const next =
          remaining[0] ??
          makeConversation(
            deletedActive?.mode ?? 'assistant',
            deletedActive?.tutor ?? DEFAULT_TUTOR,
          );
        applyActive(next);
      }
    },
    [applyActive, conversations, resetTransient],
  );

  const clearAll = useCallback(async () => {
    const current = activeRef.current;
    abortRef.current?.abort();
    resetTransient();

    const ids = new Set<string>();
    conversations.forEach((conversation) => ids.add(conversation.id));
    if (current) ids.add(current.id);
    ids.forEach((id) => deletedIdsRef.current.add(id));

    try {
      await clearAllData();
    } catch {
      ids.forEach((id) => deletedIdsRef.current.delete(id));
      setStorageError('No se pudo borrar el historial.');
      return;
    }

    setConversations([]);
    applyActive(
      makeConversation(
        current?.mode ?? 'assistant',
        current?.tutor ?? DEFAULT_TUTOR,
      ),
    );
  }, [applyActive, conversations, resetTransient]);

  const setMode = useCallback(
    (mode: Mode) => {
      const current = activeRef.current;
      if (!current || streaming || current.mode === mode) return;
      const next = { ...current, mode };
      applyActive(next);
      if (next.messages.length) void persistConversation(next);
    },
    [applyActive, persistConversation, streaming],
  );

  const updatePersonality = useCallback((next: PersonalityConfig) => {
    setPersonality(savePersonality(next));
  }, []);

  const updateTutor = useCallback(
    (partial: Partial<TutorConfig>) => {
      const current = activeRef.current;
      if (!current || streaming) return;
      const next = {
        ...current,
        tutor: { ...current.tutor, ...partial },
      };
      applyActive(next);
      if (next.messages.length) void persistConversation(next);
    },
    [applyActive, persistConversation, streaming],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || processing || streaming) return;
      const generation = attachmentGenerationRef.current + 1;
      attachmentGenerationRef.current = generation;
      setProcessing(true);
      setAttachmentError(null);

      let current = pendingAttachments.map((attachment) => ({ ...attachment }));
      let error: string | null = null;

      for (const file of files) {
        const kind = file.type.startsWith('image/')
          ? 'image'
          : file.type === 'application/pdf' ||
              file.name.toLowerCase().endsWith('.pdf')
            ? 'pdf'
            : file.type === 'text/plain' ||
                file.type === 'text/vtt' ||
                file.type === 'application/x-subrip' ||
                /\.(txt|srt|vtt|pptx)$/i.test(file.name) ||
                file.type ===
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
              ? 'text'
              : null;
        if (!kind) {
          error = file.type.startsWith('video/')
            ? 'Para estudiar un video, adjuntá sus subtítulos .srt o .vtt; la IA gratis no transcribe audio.'
            : 'Solo se pueden adjuntar PNG, JPG, WebP, PDF, TXT, SRT/VTT o PPTX.';
          continue;
        }
        const limit = attachmentLimitError(current, kind);
        if (limit) {
          error = limit;
          continue;
        }
        try {
          const prepared = await prepareAttachment(file);
          current = [...current, prepared];
          if (
            attachmentGenerationRef.current === generation &&
            mountedRef.current
          ) {
            setPendingAttachments(current);
          }
        } catch (caught) {
          error =
            caught instanceof AttachmentError
              ? caught.message
              : 'No se pudo procesar el archivo.';
        }
      }

      if (
        attachmentGenerationRef.current === generation &&
        mountedRef.current
      ) {
        setAttachmentError(error);
        setProcessing(false);
      }
    },
    [pendingAttachments, processing, streaming],
  );

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((previous) =>
      previous.filter((attachment) => attachment.id !== id),
    );
    setAttachmentError(null);
  }, []);

  const generatePractice = useCallback(
    async (settings: PracticeSettings) => {
      const current = activeRef.current;
      if (!current || practiceLoading || streaming) return;

      const cleaned: PracticeSettings = {
        ...settings,
        topic: settings.topic?.trim() || undefined,
      };
      const generation = quizGenerationRef.current + 1;
      quizGenerationRef.current = generation;
      const controller = new AbortController();
      quizAbortRef.current = controller;
      setPracticeLoading(true);
      setPracticeError(null);

      try {
        const result = await requestQuiz(
          {
            subject: current.tutor.subject,
            level: current.tutor.level,
            topic: cleaned.topic,
            count: cleaned.count,
            difficulty: cleaned.difficulty,
            country: curriculumCountryForRequest(),
            language: personality.language,
            examFormat: cleaned.examFormat,
          },
          controller.signal,
        );
        if (
          quizGenerationRef.current === generation &&
          mountedRef.current
        ) {
          setQuiz({
            id: newId(),
            quiz: result,
            settings: cleaned,
            subject: current.tutor.subject,
            level: current.tutor.level,
            startedAt: Date.now(),
          });
          if (result.demo) {
            setDemo(true);
            saveDemoMode(true);
          }
        }
      } catch (error) {
        if (
          !isAbortError(error) &&
          quizGenerationRef.current === generation &&
          mountedRef.current
        ) {
          setPracticeError(
            error instanceof ApiError
              ? error.message
              : 'No se pudo generar la práctica. Probá de nuevo.',
          );
        }
      } finally {
        if (
          quizGenerationRef.current === generation &&
          mountedRef.current
        ) {
          setPracticeLoading(false);
        }
        if (quizAbortRef.current === controller) quizAbortRef.current = null;
      }
    },
    [practiceLoading, streaming, personality.language],
  );

  const recordPracticeResult = useCallback(
    async (result: PracticeResult): Promise<boolean> => {
      try {
        await savePracticeResult(result);
        return true;
      } catch {
        setStorageError('No se pudo guardar la práctica en este dispositivo.');
        return false;
      }
    },
    [],
  );

  const closeQuiz = useCallback(() => {
    quizGenerationRef.current += 1;
    quizAbortRef.current?.abort();
    quizAbortRef.current = null;
    setQuiz(null);
    setPracticeLoading(false);
    setPracticeError(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const stored = await listConversations();
        if (cancelled || !mountedRef.current) return;
        setConversations(stored);
        applyActive(stored[0] ?? makeConversation());
      } catch {
        if (cancelled || !mountedRef.current) return;
        setStorageError('No se pudo abrir el historial local.');
        applyActive(makeConversation());
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();

    void fetchHealth()
      .then((health) => {
        if (!cancelled && mountedRef.current) {
          setDemo(health.demo);
          saveDemoMode(health.demo);
          setProvider(health.provider);
          setVision(health.vision);
          setVoice(health.voice);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      abortRef.current?.abort();
      quizAbortRef.current?.abort();
      clearFlushTimer();
    };
  }, [applyActive, clearFlushTimer]);

  return {
    loading,
    conversations,
    active,
    streaming,
    streamingId,
    demo,
    provider,
    vision,
    pendingAttachments,
    processing,
    attachmentError,
    composerError,
    practiceLoading,
    practiceError,
    quiz,
    personality,
    voice,
    storageError,
    contextNotice,
    actions: {
      newChat,
      selectConversation,
      sendMessage,
      stop,
      retryLast,
      renameConversation,
      deleteConversation,
      clearAll,
      setMode,
      updateTutor,
      updatePersonality,
      addFiles,
      removeAttachment,
      dismissAttachmentError: () => setAttachmentError(null),
      dismissComposerError: () => setComposerError(null),
      dismissStorageError: () => setStorageError(null),
      dismissContextNotice: () => setContextNotice(null),
      generatePractice,
      recordPracticeResult,
      closeQuiz,
      dismissPracticeError: () => setPracticeError(null),
    },
  };
}
