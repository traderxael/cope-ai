import type { Conversation } from '../lib/storage';
import { Dialog } from './Dialog';
import { Sidebar } from './Sidebar';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId?: string;
  demo: boolean | null;
  provider?: 'openai' | 'ollama' | 'pollinations' | 'fixtures' | null;
  resolvedTheme: 'light' | 'dark';
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onExport: (conversation: Conversation) => void;
  onSettings: () => void;
  onProgress: () => void;
  onBadges: () => void;
  onFocus: () => void;
  onToggleTheme: () => void;
}

export function MobileSidebar({
  open,
  onClose,
  conversations,
  activeId,
  demo,
  provider,
  resolvedTheme,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onExport,
  onSettings,
  onProgress,
  onBadges,
  onFocus,
  onToggleTheme,
}: MobileSidebarProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Conversaciones"
      variant="drawer"
      hideHeader
    >
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        demo={demo}
        provider={provider}
        resolvedTheme={resolvedTheme}
        onSelect={(id) => {
          onSelect(id);
          onClose();
        }}
        onNew={() => {
          onNew();
          onClose();
        }}
        onRename={(conversation) => {
          onClose();
          onRename(conversation);
        }}
        onDelete={(conversation) => {
          onClose();
          onDelete(conversation);
        }}
        onExport={(conversation) => {
          onClose();
          onExport(conversation);
        }}
        onSettings={() => {
          onClose();
          onSettings();
        }}
        onProgress={() => {
          onClose();
          onProgress();
        }}
        onBadges={() => {
          onClose();
          onBadges();
        }}
        onFocus={() => {
          onClose();
          onFocus();
        }}
        onToggleTheme={onToggleTheme}
        onClose={onClose}
      />
    </Dialog>
  );
}
