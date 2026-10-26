import type { Mode } from '../../shared/types';
import { Icon } from './Icon';

interface SegmentedModeProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  disabled?: boolean;
}

export function SegmentedMode({
  mode,
  onChange,
  disabled = false,
}: SegmentedModeProps) {
  return (
    <div className="modeSwitch" role="group" aria-label="Modo de conversación">
      <button
        type="button"
        className={mode === 'assistant' ? 'modeOption isActive' : 'modeOption'}
        aria-pressed={mode === 'assistant'}
        onClick={() => onChange('assistant')}
        disabled={disabled}
      >
        <Icon name="sparkles" size={16} />
        <span>Asistente</span>
      </button>
      <button
        type="button"
        className={mode === 'tutor' ? 'modeOption isActive' : 'modeOption'}
        aria-pressed={mode === 'tutor'}
        onClick={() => onChange('tutor')}
        disabled={disabled}
      >
        <Icon name="graduation" size={16} />
        <span>Tutor</span>
      </button>
    </div>
  );
}
