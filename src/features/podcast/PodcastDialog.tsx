import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '../../../shared/limits';
import type { PodcastResponse } from '../../../shared/schemas/podcast';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type TutorConfig,
} from '../../../shared/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { ApiError, requestPodcast } from '../../lib/api';
import { loadVoiceSettings } from '../../lib/voice';
import {
  speakText,
  speechSynthesisSupported,
  stopSpeaking,
} from '../../lib/speech/tts';

interface PodcastDialogProps {
  open: boolean;
  onClose: () => void;
  tutor: TutorConfig;
  online: boolean;
}

export function PodcastDialog({
  open,
  onClose,
  tutor,
  online,
}: PodcastDialogProps) {
  const [topic, setTopic] = useState('');
  const [podcast, setPodcast] = useState<PodcastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      stopSpeaking();
      setPlaying(false);
    }
    return () => {
      stopSpeaking();
    };
  }, [open]);

  const generate = async () => {
    if (!online || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    stopSpeaking();
    setPlaying(false);
    setLoading(true);
    setError(null);

    try {
      const result = await requestPodcast(
        {
          subject: tutor.subject,
          level: tutor.level,
          ...(topic.trim() ? { topic: topic.trim() } : {}),
        },
        controller.signal,
      );
      if (abortRef.current === controller) setPodcast(result);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo generar el podcast.',
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const togglePlayback = async () => {
    if (!podcast) return;
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    if (!speechSynthesisSupported()) {
      setError('La voz del navegador no está disponible.');
      return;
    }

    setError(null);
    setPlaying(true);
    try {
      await speakText(
        `${podcast.title}. ${podcast.script}`,
        loadVoiceSettings().profile,
      );
    } catch {
      setError('No se pudo reproducir el podcast.');
    } finally {
      setPlaying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Podcast de estudio"
      description="Un repaso en audio para tu materia y nivel."
      className="podcastDialog"
    >
      <div className="studyForm">
        <label className="fieldLabel" htmlFor="podcast-topic">
          Tema <span className="fieldOptional">(opcional)</span>
        </label>
        <input
          id="podcast-topic"
          className="textInput"
          value={topic}
          maxLength={LIMITS.maxTopicChars}
          placeholder={`Ej. ${SUBJECT_LABELS[tutor.subject]}`}
          onChange={(event) => setTopic(event.target.value)}
          disabled={loading}
        />
        <p className="fieldHint">
          {SUBJECT_LABELS[tutor.subject]} · {LEVEL_LABELS[tutor.level]}
        </p>
        <button
          type="button"
          className="button primary"
          onClick={() => void generate()}
          disabled={!online || loading}
        >
          {loading ? (
            <>
              <span className="spinner small" aria-hidden="true" />
              Generando…
            </>
          ) : (
            <>
              <Icon name="sparkles" size={17} />
              Generar podcast
            </>
          )}
        </button>
        {!online ? (
          <p className="fieldHint">
            Necesitás conexión para generar el podcast.
          </p>
        ) : null}
        {error ? (
          <p className="inlineError" role="alert">
            <Icon name="alert" size={17} />
            <span>{error}</span>
          </p>
        ) : null}
      </div>

      {podcast ? (
        <article className="podcastScript" aria-label="Guion del podcast">
          <header>
            <p className="eyebrow">Episodio</p>
            <h3>{podcast.title}</h3>
          </header>
          <div className="podcastText">
            {podcast.script
              .split(/\n{2,}/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
          <div className="podcastActions">
            <button
              type="button"
              className="button secondary"
              onClick={() => void togglePlayback()}
              disabled={loading}
            >
              <Icon name={playing ? 'stop' : 'volume'} size={17} />
              {playing ? 'Detener' : 'Escuchar'}
            </button>
          </div>
        </article>
      ) : null}
    </Dialog>
  );
}
