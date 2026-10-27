export interface DictationHandlers {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}

interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => RecognitionLike;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return Boolean(recognitionConstructor());
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'No diste permiso para usar el micrófono.',
  'service-not-allowed': 'El navegador bloqueó el reconocimiento de voz.',
  'no-speech': 'No se escuchó ninguna respuesta. Probá de nuevo.',
  'audio-capture': 'No se encontró un micrófono disponible.',
  network: 'El reconocimiento de voz necesita conexión.',
  aborted: 'Se detuvo la grabación.',
};

export interface Dictation {
  stop: () => void;
  abort: () => void;
}

export function startDictation(handlers: DictationHandlers): Dictation {
  const Recognition = recognitionConstructor();
  if (!Recognition) {
    handlers.onError('Este navegador no admite dictado por voz. Escribí tu respuesta.');
    return { stop: () => undefined, abort: () => undefined };
  }

  const recognition = new Recognition();
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (!result) continue;
      const transcript = result[0]?.transcript ?? '';
      if (result.isFinal) final += transcript;
      else interim += transcript;
    }
    if (interim) handlers.onInterim?.(interim);
    if (final) handlers.onFinal(final);
  };
  recognition.onerror = (event) => {
    const code = event.error ?? 'unknown';
    handlers.onError(ERROR_MESSAGES[code] ?? 'No se pudo usar el micrófono.');
  };
  recognition.onend = () => handlers.onEnd?.();

  try {
    recognition.start();
  } catch {
    handlers.onError('No se pudo iniciar el micrófono. Probá de nuevo.');
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // Ya estaba detenido.
      }
    },
    abort: () => {
      try {
        recognition.abort();
      } catch {
        // Ya estaba detenido.
      }
    },
  };
}
