import type { Conversation } from './storage';

const ROLE_LABELS = { user: 'Vos', assistant: 'Cope' } as const;

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function conversationToMarkdown(
  conversation: Conversation,
): string {
  const lines = [
    `# ${conversation.title}`,
    '',
    `_${new Date(conversation.createdAt).toLocaleString('es')}_`,
    '',
  ];
  for (const message of conversation.messages) {
    lines.push(
      `## ${ROLE_LABELS[message.role]}`,
      '',
      message.content.trim(),
      '',
    );
    const attachments = message.attachments ?? [];
    if (attachments.length > 0) {
      lines.push(
        ...attachments.map(
          (attachment) => `- Adjunto: ${attachment.name} (${attachment.kind})`,
        ),
        '',
      );
    }
  }
  return `${lines.join('\n').trim()}\n`;
}

export function conversationFileName(
  title: string,
  date = new Date(),
): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `cope-${slug || 'conversacion'}-${localDate(date)}.md`;
}

export function downloadConversation(conversation: Conversation): void {
  const blob = new Blob([conversationToMarkdown(conversation)], {
    type: 'text/markdown',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = conversationFileName(conversation.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
