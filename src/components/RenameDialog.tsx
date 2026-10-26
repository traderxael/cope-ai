import { useEffect, useState } from 'react';
import type { Conversation } from '../lib/storage';
import { Dialog } from './Dialog';

interface RenameDialogProps {
  conversation: Conversation | null;
  onClose: () => void;
  onRename: (id: string, title: string) => void;
}

export function RenameDialog({
  conversation,
  onClose,
  onRename,
}: RenameDialogProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(conversation?.title ?? '');
  }, [conversation]);

  return (
    <Dialog
      open={Boolean(conversation)}
      onClose={onClose}
      title="Renombrar conversación"
      description="Un nombre corto ayuda a encontrarla después."
    >
      <form
        className="renameForm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!conversation) return;
          const title = value.trim();
          if (!title) return;
          onRename(conversation.id, title);
          onClose();
        }}
      >
        <label className="fieldLabel" htmlFor="rename-conversation">
          Título
        </label>
        <input
          id="rename-conversation"
          className="textInput"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={90}
          data-autofocus
        />
        <div className="dialogActions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!value.trim()}
          >
            Guardar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
