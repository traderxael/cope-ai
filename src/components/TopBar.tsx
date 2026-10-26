import { Icon } from './Icon';
import { Logo } from './Logo';

interface TopBarProps {
  title: string;
  onMenu: () => void;
  onNewChat: () => void;
}

export function TopBar({ title, onMenu, onNewChat }: TopBarProps) {
  return (
    <header className="topBar">
      <button
        type="button"
        className="iconButton"
        aria-label="Abrir conversaciones"
        onClick={onMenu}
      >
        <Icon name="menu" size={21} />
      </button>
      <div className="topBarTitle">
        <Logo size={26} />
        <span>{title}</span>
      </div>
      <button
        type="button"
        className="iconButton"
        aria-label="Nueva conversación"
        onClick={onNewChat}
      >
        <Icon name="plus" size={21} />
      </button>
    </header>
  );
}
