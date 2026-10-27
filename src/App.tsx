import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SUBJECT_LABELS } from '../shared/types';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Composer } from './components/Composer';
import { Dialog } from './components/Dialog';
import { EmptyState } from './components/EmptyState';
import { Icon } from './components/Icon';
import { Logo } from './components/Logo';
import { MessageList } from './components/MessageList';
import { MobileSidebar } from './components/MobileSidebar';
import { RenameDialog } from './components/RenameDialog';
import { SegmentedMode } from './components/SegmentedMode';
import { SettingsDialog } from './components/SettingsDialog';
import { Sidebar } from './components/Sidebar';
import { Toast, type ToastMessage, type ToastTone } from './components/Toast';
import { TopBar } from './components/TopBar';
import { QuizCard } from './features/quiz/QuizCard';
import { TutorPanel } from './features/tutor/TutorPanel';
import { useChatApp } from './features/assistant/useChatApp';
import {
  DEFAULT_PRACTICE_SETTINGS,
  type PracticeSettings,
} from './features/study/practice';
import { ProgressDialog } from './features/study/ProgressDialog';
import { FlashcardsDialog } from './features/study/FlashcardsDialog';
import { StudyPlanDialog } from './features/study/StudyPlanDialog';
import { applyPwaUpdate, setupPwa } from './lib/pwa';
import type { Conversation, PracticeResult } from './lib/storage';
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  storeTheme,
  type Theme,
} from './lib/theme';
import { useOnlineStatus } from './lib/useOnlineStatus';

export default function App() {
  const chat = useChatApp();
  const online = useOnlineStatus();

  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(getStoredTheme()),
  );
  const [draft, setDraft] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [studyPlanOpen, setStudyPlanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const toastIdRef = useRef(0);

  const notify = useCallback(
    (
      message: string,
      tone: ToastTone = 'info',
      action?: ToastMessage['action'],
    ) => {
      toastIdRef.current += 1;
      setToast({
        id: toastIdRef.current,
        message,
        tone,
        ...(action ? { action } : {}),
      });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const changeTheme = useCallback((next: Theme) => {
    setTheme(next);
    storeTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    changeTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [changeTheme, resolvedTheme]);

  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);
    if (theme !== 'system' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(applyTheme('system'));
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    setupPwa({
      onNeedRefresh: () => setUpdateReady(true),
      onOfflineReady: () =>
        notify('Cope AI está listo para usarse sin conexión.', 'success'),
    });
  }, [notify]);

  const activeId = chat.active?.id;
  useEffect(() => {
    setDraft('');
  }, [activeId]);

  useEffect(() => {
    if (chat.quiz) setTutorOpen(false);
  }, [chat.quiz]);

  useEffect(() => {
    if (chat.practiceError) setTutorOpen(false);
  }, [chat.practiceError]);

  const submit = useCallback(
    (text: string): boolean => {
      const sent = chat.actions.sendMessage(text);
      if (sent) setDraft('');
      return sent;
    },
    [chat.actions],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        notify('Copiado al portapapeles.', 'success');
      } catch {
        notify('No se pudo copiar el texto.', 'error');
      }
    },
    [notify],
  );

  const handleNewChat = useCallback(() => {
    chat.actions.newChat();
    setDraft('');
    setMobileNavOpen(false);
    setTutorOpen(false);
  }, [chat.actions]);

  const newChatRef = useRef(handleNewChat);
  useEffect(() => {
    newChatRef.current = handleNewChat;
  }, [handleNewChat]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.toLowerCase() !== 'n' ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      newChatRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
      }
    };
    window.addEventListener('dragover', preventFileNavigation);
    window.addEventListener('drop', preventFileNavigation);
    return () => {
      window.removeEventListener('dragover', preventFileNavigation);
      window.removeEventListener('drop', preventFileNavigation);
    };
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      chat.actions.selectConversation(id);
      setDraft('');
      setMobileNavOpen(false);
      setTutorOpen(false);
    },
    [chat.actions],
  );

  const handlePractice = useCallback(
    (settings: PracticeSettings) => {
      void chat.actions.generatePractice(settings);
    },
    [chat.actions],
  );

  const handlePracticeComplete = useCallback(
    (result: PracticeResult) => {
      const conversationId = chat.active?.id;
      void chat.actions.recordPracticeResult({
        ...result,
        ...(conversationId ? { conversationId } : {}),
      });
      notify('Práctica guardada en tu progreso.', 'success');
    },
    [chat.actions, chat.active?.id, notify],
  );

  const openFlashcards = useCallback(() => {
    setTutorOpen(false);
    setFlashcardsOpen(true);
  }, []);

  const openStudyPlan = useCallback(() => {
    setTutorOpen(false);
    setStudyPlanOpen(true);
  }, []);

  const openProgress = useCallback(() => {
    setTutorOpen(false);
    setProgressOpen(true);
  }, []);

  const clearEverything = useCallback(async () => {
    await chat.actions.clearAll();
    setProgressOpen(false);
    setFlashcardsOpen(false);
    setStudyPlanOpen(false);
  }, [chat.actions]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await chat.actions.deleteConversation(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  }, [chat.actions, deleteTarget]);

  if (chat.loading || !chat.active) {
    return (
      <main className="bootScreen">
        <h1 className="srOnly">Cope AI</h1>
        <Logo withWordmark size={46} />
        <span className="spinner" aria-hidden="true" />
        <p role="status">Preparando tu espacio…</p>
      </main>
    );
  }

  const active = chat.active;
  const mode = active.mode;
  const tutor = active.tutor;
  const isEmpty = active.messages.length === 0 && !chat.quiz;
  const latestPdfText = (() => {
    for (let index = active.messages.length - 1; index >= 0; index -= 1) {
      const attachments = active.messages[index]?.attachments ?? [];
      for (
        let attachmentIndex = attachments.length - 1;
        attachmentIndex >= 0;
        attachmentIndex -= 1
      ) {
        const attachment = attachments[attachmentIndex];
        if (attachment?.kind === 'pdf' && attachment.text) {
          return attachment.text;
        }
      }
    }
    return undefined;
  })();
  const toolbarTitle =
    active.messages.length === 0 ? 'Cope AI' : active.title;

  return (
    <>
      <a className="skipLink" href="#chat-main">
        Saltar al contenido
      </a>
      <div className="appShell">
        <aside className="desktopSidebar" aria-label="Conversaciones">
          <Sidebar
            conversations={chat.conversations}
            activeId={active.id}
            demo={chat.demo}
            resolvedTheme={resolvedTheme}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
            onSettings={() => setSettingsOpen(true)}
            onProgress={openProgress}
            onToggleTheme={toggleTheme}
          />
        </aside>

        <div className="appMain">
          <TopBar
            title={toolbarTitle}
            onMenu={() => setMobileNavOpen(true)}
            onNewChat={handleNewChat}
          />

          <div className="bannerStack" role="region" aria-label="Avisos">
            {!online ? (
              <div className="banner offlineBanner" role="status">
                <Icon name="info" size={16} />
                <span>
                  Sin conexión. Podés leer el historial, pero no enviar
                  mensajes.
                </span>
              </div>
            ) : null}

            {chat.demo === true ? (
              <div className="banner demoBanner" role="status">
                <span className="demoPulse" aria-hidden="true" />
                <span>
                  <strong>Modo demo.</strong> Respuestas de ejemplo; conectá tu
                  proveedor para usar IA real.
                </span>
              </div>
            ) : null}

            {updateReady ? (
              <div className="banner updateBanner" role="status">
                <Icon name="download" size={16} />
                <span>Hay una versión nueva de Cope AI.</span>
                <span className="bannerActions">
                  <button
                    type="button"
                    className="button small primary"
                    onClick={applyPwaUpdate}
                  >
                    Actualizar
                  </button>
                  <button
                    type="button"
                    className="button small ghost"
                    onClick={() => setUpdateReady(false)}
                  >
                    Después
                  </button>
                </span>
              </div>
            ) : null}

            {chat.practiceError ? (
              <div className="banner errorBanner" role="alert">
                <Icon name="alert" size={16} />
                <span>{chat.practiceError}</span>
                <button
                  type="button"
                  className="bannerDismiss"
                  onClick={chat.actions.dismissPracticeError}
                >
                  Cerrar
                </button>
              </div>
            ) : null}

            {chat.contextNotice ? (
              <div className="banner noticeBanner" role="status">
                <Icon name="info" size={16} />
                <span>{chat.contextNotice}</span>
                <button
                  type="button"
                  className="bannerDismiss"
                  onClick={chat.actions.dismissContextNotice}
                >
                  Cerrar
                </button>
              </div>
            ) : null}

            {chat.storageError ? (
              <div className="banner errorBanner" role="alert">
                <Icon name="alert" size={16} />
                <span>{chat.storageError}</span>
                <button
                  type="button"
                  className="bannerDismiss"
                  onClick={chat.actions.dismissStorageError}
                >
                  Cerrar
                </button>
              </div>
            ) : null}
          </div>

          <main id="chat-main" className="workspace" tabIndex={-1}>
            <section className="chatPane" aria-label="Conversación">
              <header className="chatHeader">
                <div className="chatHeading">
                  <p className="eyebrow">
                    {mode === 'tutor' ? 'Tutor' : 'Asistente'}
                  </p>
                  <h1>{active.title}</h1>
                </div>
                <div className="chatHeaderActions">
                  <SegmentedMode
                    mode={mode}
                    onChange={chat.actions.setMode}
                    disabled={chat.streaming || chat.practiceLoading}
                  />
                  {mode === 'tutor' ? (
                    <button
                      type="button"
                      className="contextButton"
                      onClick={() => setTutorOpen(true)}
                    >
                      <Icon name="book" size={16} />
                      Contexto
                    </button>
                  ) : null}
                </div>
              </header>

              {isEmpty ? (
                <div className="emptyScroll">
                  <EmptyState
                    mode={mode}
                    tutor={tutor}
                    onSuggestion={(prompt) => {
                      submit(prompt);
                    }}
                    onPractice={() =>
                      handlePractice(DEFAULT_PRACTICE_SETTINGS)
                    }
                    practiceLoading={chat.practiceLoading}
                    disabled={
                      !online ||
                      chat.streaming ||
                      chat.practiceLoading ||
                      Boolean(chat.quiz)
                    }
                  />
                </div>
              ) : (
                <MessageList
                  conversationId={active.id}
                  messages={active.messages}
                  streamingId={chat.streamingId}
                  streaming={chat.streaming}
                  onRetry={chat.actions.retryLast}
                  onCopy={(text) => void copy(text)}
                >
                  {chat.quiz ? (
                    <QuizCard
                      key={chat.quiz.id}
                      session={chat.quiz}
                      label={`Práctica de ${SUBJECT_LABELS[chat.quiz.subject]}`}
                      onClose={chat.actions.closeQuiz}
                      onRetry={handlePractice}
                      retrying={chat.practiceLoading}
                      online={online}
                      onComplete={handlePracticeComplete}
                    />
                  ) : null}
                </MessageList>
              )}

              <Composer
                value={draft}
                onChange={setDraft}
                onSend={() => submit(draft)}
                onStop={chat.actions.stop}
                attachments={chat.pendingAttachments}
                onAddFiles={chat.actions.addFiles}
                onRemoveAttachment={chat.actions.removeAttachment}
                processing={chat.processing}
                streaming={chat.streaming}
                online={online}
                error={chat.attachmentError ?? chat.composerError}
                onDismissError={() => {
                  chat.actions.dismissAttachmentError();
                  chat.actions.dismissComposerError();
                }}
                placeholder={
                  mode === 'tutor'
                    ? 'Escribí tu duda o ejercicio…'
                    : 'Preguntá lo que necesites…'
                }
              />
            </section>

            {mode === 'tutor' ? (
              <aside className="tutorAside" aria-label="Contexto del tutor">
                <TutorPanel
                  tutor={tutor}
                  onChange={chat.actions.updateTutor}
                  online={online}
                  onPractice={handlePractice}
                  practiceLoading={chat.practiceLoading}
                  disabled={
                    chat.streaming ||
                    chat.practiceLoading ||
                    Boolean(chat.quiz)
                  }
                  onOpenFlashcards={openFlashcards}
                  onOpenPlan={openStudyPlan}
                  onOpenProgress={openProgress}
                />
              </aside>
            ) : null}
          </main>
        </div>

        <MobileSidebar
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          conversations={chat.conversations}
          activeId={active.id}
          demo={chat.demo}
          resolvedTheme={resolvedTheme}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
          onSettings={() => setSettingsOpen(true)}
          onProgress={openProgress}
          onToggleTheme={toggleTheme}
        />

        <Dialog
          open={tutorOpen}
          onClose={() => setTutorOpen(false)}
          title="Contexto del tutor"
          description="Ajustá materia y nivel antes de practicar."
        >
          <TutorPanel
            tutor={tutor}
            onChange={chat.actions.updateTutor}
            online={online}
            onPractice={handlePractice}
            practiceLoading={chat.practiceLoading}
            disabled={
              chat.streaming || chat.practiceLoading || Boolean(chat.quiz)
            }
            onOpenFlashcards={openFlashcards}
            onOpenPlan={openStudyPlan}
            onOpenProgress={openProgress}
          />
        </Dialog>

        <ProgressDialog
          open={progressOpen}
          onClose={() => setProgressOpen(false)}
        />

        <FlashcardsDialog
          open={flashcardsOpen}
          onClose={() => setFlashcardsOpen(false)}
          tutor={tutor}
          online={online}
          latestPdfText={latestPdfText}
        />

        <StudyPlanDialog
          open={studyPlanOpen}
          onClose={() => setStudyPlanOpen(false)}
          tutor={tutor}
          online={online}
        />

        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onThemeChange={changeTheme}
          demo={chat.demo}
          onClearAll={clearEverything}
        />

        <RenameDialog
          conversation={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRename={chat.actions.renameConversation}
        />

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Borrar conversación"
          description={
            <>
              Se borrará <strong>{deleteTarget?.title}</strong> del historial
              local. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Borrar"
          danger
          busy={deleting}
          onConfirm={() => void handleDeleteConfirm()}
          onClose={() => setDeleteTarget(null)}
        />

        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </>
  );
}
