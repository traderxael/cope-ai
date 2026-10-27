import type { VoiceProfile } from './speech/tts';

export type VoiceMode = 'browser' | 'external' | 'cloned';

export interface VoiceSettings {
  profile: VoiceProfile;
  mode: VoiceMode;
  clonedVoiceId?: string;
  clonedLabel?: string;
}

const SETTINGS_KEY = 'cope-voice-v1';
const OWNER_KEY = 'cope-owner-code';

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  profile: 'cercana',
  mode: 'browser',
};

function isProfile(value: unknown): value is VoiceProfile {
  return value === 'grave' || value === 'cercana' || value === 'neutra';
}

function isMode(value: unknown): value is VoiceMode {
  return value === 'browser' || value === 'external' || value === 'cloned';
}

export function loadVoiceSettings(): VoiceSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_VOICE_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return {
      profile: isProfile(parsed.profile)
        ? parsed.profile
        : DEFAULT_VOICE_SETTINGS.profile,
      mode: isMode(parsed.mode) ? parsed.mode : DEFAULT_VOICE_SETTINGS.mode,
      clonedVoiceId:
        typeof parsed.clonedVoiceId === 'string' && parsed.clonedVoiceId.trim()
          ? parsed.clonedVoiceId.trim()
          : undefined,
      clonedLabel:
        typeof parsed.clonedLabel === 'string' && parsed.clonedLabel.trim()
          ? parsed.clonedLabel.trim()
          : undefined,
    };
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

export function saveVoiceSettings(settings: VoiceSettings): VoiceSettings {
  const next: VoiceSettings = {
    profile: isProfile(settings.profile)
      ? settings.profile
      : DEFAULT_VOICE_SETTINGS.profile,
    mode: isMode(settings.mode) ? settings.mode : DEFAULT_VOICE_SETTINGS.mode,
    ...(settings.clonedVoiceId
      ? { clonedVoiceId: settings.clonedVoiceId.trim() }
      : {}),
    ...(settings.clonedLabel
      ? { clonedLabel: settings.clonedLabel.trim() }
      : {}),
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento, la app mantiene el default.
  }
  return next;
}

export function loadOwnerCode(): string {
  if (typeof sessionStorage === 'undefined') return '';
  try {
    return sessionStorage.getItem(OWNER_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveOwnerCode(code: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (code.trim()) sessionStorage.setItem(OWNER_KEY, code.trim());
    else sessionStorage.removeItem(OWNER_KEY);
  } catch {
    // sessionStorage puede estar bloqueado.
  }
}
