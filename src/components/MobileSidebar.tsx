import type { Conversation } from '../lib/storage';
import { Dialog } from './Dialog';
import { Sidebar } from './Sidebar';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId?: string;
  demo: boolean | null;
  resolvedTheme: 'light' | 'dark';
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onSettings: () => void;
  onToggleTheme: () => void;
}

export function MobileSidebar({
  open,
  onClose,
  conversations,
  activeId,
  demo,
  resolvedTheme,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onSettings,
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
        onSettings={() => {
          onClose();
          onSettings();
        }}
        onToggleTheme={onToggleTheme}
        onClose={onClose}
      />
    </Dialog>
  );
}
