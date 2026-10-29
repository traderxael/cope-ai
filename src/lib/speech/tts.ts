import { loadVoiceSettings } from '../voice';
import type { ResponseLanguage } from '../../../shared/schemas/personality';

export type VoiceProfile = 'grave' | 'cercana' | 'neutra';

export const VOICE_LANGUAGE_LOCALES: Record<ResponseLanguage, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  ar: 'ar-SA',
  hi: 'hi-IN',
  ru: 'ru-RU',
  uk: 'uk-UA',
  nl: 'nl-NL',
  pl: 'pl-PL',
  tr: 'tr-TR',
  sv: 'sv-SE',
  no: 'nb-NO',
  da: 'da-DK',
  fi: 'fi-FI',
  cs: 'cs-CZ',
  sk: 'sk-SK',
  ro: 'ro-RO',
  hu: 'hu-HU',
  el: 'el-GR',
  he: 'he-IL',
  id: 'id-ID',
  ms: 'ms-MY',
  vi: 'vi-VN',
  th: 'th-TH',
  tl: 'fil-PH',
  bn: 'bn-BD',
  fa: 'fa-IR',
  sw: 'sw-KE',
  ca: 'ca-ES',
  gl: 'gl-ES',
  eu: 'eu-ES',
  sr: 'sr-RS',
};

export const VOICE_PROFILE_LABELS: Record<VoiceProfile, string> = {
  grave: 'Grave',
  cercana: 'Cercana',
  neutra: 'Neutra',
};

const PROFILE_SETTINGS: Record<
  VoiceProfile,
  { pitch: number; rate: number; preferred: string[] }
> = {
  grave: { pitch: 0.82, rate: 0.92, preferred: ['es-ES', 'es-MX', 'es-US'] },
  cercana: { pitch: 1.05, rate: 0.96, preferred: ['es-MX', 'es-ES', 'es-US'] },
  neutra: { pitch: 1, rate: 1, preferred: ['es-ES', 'es-MX', 'es-US'] },
};

export function speechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );
}

let externalAudio: HTMLAudioElement | null = null;
let externalUrl: string | null = null;

function stopExternal(): void {
  if (externalAudio) {
    externalAudio.pause();
    externalAudio = null;
  }
  if (externalUrl) {
    URL.revokeObjectURL(externalUrl);
    externalUrl = null;
  }
}

export function stopSpeaking(): void {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel();
  stopExternal();
}

export async function speakExternal(
  text: string,
  options: { voiceId?: string; ownerCode: string },
): Promise<void> {
  stopSpeaking();
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'x-cope-owner': options.ownerCode,
    },
    body: JSON.stringify({
      text,
      ...(options.voiceId ? { voiceId: options.voiceId } : {}),
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    let message = 'No se pudo generar la voz externa.' ;
    try {
      const payload = (await response.json()) as {
        error?: { message?: unknown };
      };
      if (typeof payload.error?.message === 'string') {
        message = payload.error.message;
      }
    } catch {
      // Respuesta sin JSON.
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  externalAudio = audio;
  externalUrl = url;
  return new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      stopExternal();
      resolve();
    };
    audio.onerror = () => {
      stopExternal();
      reject(new Error('No se pudo reproducir el audio MP3.'));
    };
    void audio.play().catch((error) => {
      stopExternal();
      reject(error instanceof Error ? error : new Error('Audio bloqueado.'));
    });
  });
}

function pickVoice(
  profile: VoiceProfile,
  language: ResponseLanguage,
): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const locale = VOICE_LANGUAGE_LOCALES[language] ?? 'es-ES';
  const primary = locale.split('-')[0]?.toLowerCase() ?? 'es';
  const matching = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(primary),
  );
  if (!matching.length) return null;
  const exact = matching.find(
    (voice) => voice.lang.toLowerCase() === locale.toLowerCase(),
  );
  if (exact) return exact;
  if (language === 'es') {
    for (const lang of PROFILE_SETTINGS[profile].preferred) {
      const match = matching.find(
        (voice) => voice.lang.toLowerCase() === lang.toLowerCase(),
      );
      if (match) return match;
    }
  }
  return matching[0] ?? null;
}

export function speakText(
  text: string,
  profile: VoiceProfile = 'neutra',
  language: ResponseLanguage = 'es',
): Promise<void> {
  if (!speechSynthesisSupported()) {
    return Promise.reject(new Error('La voz del navegador no está disponible.'));
  }
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return Promise.resolve();

  window.speechSynthesis.cancel();
  const voiceSettings = loadVoiceSettings();
  const base = PROFILE_SETTINGS[profile];
  const userPitch = voiceSettings.pitch ?? 0;
  const userRatePercent = voiceSettings.rate ?? 0;
  const finalPitch = Math.min(
    2,
    Math.max(0.1, base.pitch * 2 ** (userPitch / 12)),
  );
  const finalRate = Math.min(
    2,
    Math.max(0.5, base.rate * (1 + userRatePercent / 100)),
  );

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = VOICE_LANGUAGE_LOCALES[language] ?? 'es-ES';
  utterance.pitch = finalPitch;
  utterance.rate = finalRate;
  const voice = pickVoice(profile, language);
  if (voice) utterance.voice = voice;

  return new Promise<void>((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') {
        resolve();
        return;
      }
      reject(new Error('No se pudo reproducir la voz del navegador.'));
    };
    window.speechSynthesis.speak(utterance);
  });
}