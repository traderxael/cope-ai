import { useEffect, useState } from 'react';
import { LIMITS } from '../../../shared/limits';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type TutorConfig,
} from '../../../shared/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { requestFlashcards } from '../../lib/api';
import {
  newId,
  listFlashcardDecks,
  saveFlashcardDeck,
  type Flashcard,
  type FlashcardDeck,
} from '../../lib/storage';
import {
  newSrsFields,
  scheduleReview,
  type ReviewRating,
} from '../../lib/srs';

interface FlashcardsDialogProps {
  open: boolean;
  onClose: () => void;
  tutor: TutorConfig;
  online: boolean;
  latestPdfText?: string;
}

type View = 'list' | 'generate' | 'review';

export function FlashcardsDialog({
  open,
  onClose,
  tutor,
  online,
  latestPdfText,
}: FlashcardsDialogProps) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>('list');
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [forcedReview, setForcedReview] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState<6 | 8 | 10>(8);
  const [usePdf, setUsePdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setView('list');
    setDeck(null);
    setQueue([]);
    setForcedReview(false);
    setTopic('');
    setCount(8);
    setUsePdf(false);
    setError(null);
    void listFlashcardDecks()
      .then((stored) => {
        if (!cancelled) setDecks(stored);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron leer los decks guardados.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const startReview = (selected: FlashcardDeck, force = false) => {
    const now = Date.now();
    const due = selected.cards.filter((card) => card.dueAt <= now);
    const queueCards = due.length > 0 ? due : force ? selected.cards : [];
    setDeck(selected);
    setQueue(queueCards);
    setReviewTotal(queueCards.length);
    setForcedReview(force && due.length === 0);
    setRevealed(false);
    setError(null);
    setView('review');
  };

  const nextDueLabel = (selected: FlashcardDeck | null): string => {
    if (!selected?.cards.length) return 'más adelante';
    const next = Math.min(...selected.cards.map((card) => card.dueAt));
    return new Date(next).toLocaleString('es', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generate = async () => {
    if (!online || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await requestFlashcards({
        subject: tutor.subject,
        level: tutor.level,
        topic: topic.trim() || undefined,
        count,
        sourceText:
          usePdf && latestPdfText
            ? latestPdfText.slice(0, LIMITS.maxSourceTextChars)
            : undefined,
      });
      const now = Date.now();
      const cards: Flashcard[] = result.cards.map((card) => ({
        ...card,
        ...newSrsFields(now),
      }));
      const cleanTopic = topic.trim() || undefined;
      const newDeck: FlashcardDeck = {
        id: newId(),
        title: `${SUBJECT_LABELS[tutor.subject]}${cleanTopic ? ` · ${cleanTopic}` : ' · Repaso'}`,
        subject: tutor.subject,
        level: tutor.level,
        topic: cleanTopic,
        sourceName:
          usePdf && latestPdfText ? 'Último PDF de la conversación' : undefined,
        cards,
        createdAt: now,
        updatedAt: now,
      };
      await saveFlashcardDeck(newDeck);
      setDecks((previous) => [newDeck, ...previous]);
      startReview(newDeck);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudieron generar las flashcards.',
      );
    } finally {
      setBusy(false);
    }
  };

  const rate = async (rating: ReviewRating) => {
    const current = queue[0];
    if (!current || !deck || !revealed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updatedCard: Flashcard = {
        ...current,
        ...scheduleReview(current, rating, Date.now()),
      };
      const updatedDeck: FlashcardDeck = {
        ...deck,
        cards: deck.cards.map((card) =>
          card.id === current.id ? updatedCard : card,
        ),
        updatedAt: Date.now(),
      };
      await saveFlashcardDeck(updatedDeck);
      setDeck(updatedDeck);
      setDecks((previous) =>
        previous.map((item) =>
          item.id === updatedDeck.id ? updatedDeck : item,
        ),
      );
      setQueue((previous) =>
        rating === 'again'
          ? [...previous.slice(1), updatedCard]
          : previous.slice(1),
      );
      setRevealed(false);
    } catch {
      setError('No se pudo guardar el repaso en este dispositivo.');
    } finally {
      setBusy(false);
    }
  };

  const current = queue[0];
  const dueCount = (selected: FlashcardDeck) =>
    selected.cards.filter((card) => card.dueAt <= Date.now()).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Flashcards"
      description="Repaso con repetición espaciada en este dispositivo."
      className="flashcardsDialog"
    >
      {error ? (
        <div className="inlineError" role="alert">
          <Icon name="alert" size={17} />
          <span>{error}</span>
          <button
            type="button"
            className="inlineErrorClose"
            aria-label="Cerrar aviso"
            onClick={() => setError(null)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="studyLoading" role="status">
          <span className="spinner" aria-hidden="true" />
          Cargando decks…
        </div>
      ) : view === 'list' ? (
        <>
          <div className="studyDialogToolbar">
            <span>
              {decks.length === 0
                ? 'Sin decks todavía'
                : `${decks.length} deck${decks.length === 1 ? '' : 's'}`}
            </span>
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                setView('generate');
                setError(null);
              }}
            >
              <Icon name="plus" size={15} />
              Nuevo deck
            </button>
          </div>

          {decks.length === 0 ? (
            <div className="studyEmpty">
              <span className="studyEmptyIcon">
                <Icon name="cards" size={24} />
              </span>
              <h3>Convertí el repaso en tarjetas</h3>
              <p>
                Generá un deck por materia o tema. Cope te da el frente y el
                reverso, y programa el próximo repaso.
              </p>
            </div>
          ) : (
            <ul className="deckList">
              {decks.map((item) => {
                const due = dueCount(item);
                return (
                  <li className="deckItem" key={item.id}>
                    <div className="deckCopy">
                      <strong>{item.title}</strong>
                      <span>
                        {SUBJECT_LABELS[item.subject]} ·{' '}
                        {LEVEL_LABELS[item.level]} · {item.cards.length} tarjetas
                        {due > 0 ? ` · ${due} para repasar` : ''}
                        {item.sourceName ? ` · ${item.sourceName}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => startReview(item)}
                    >
                      Repasar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : view === 'generate' ? (
        <div className="studyForm">
          <div className="studyFormIntro">
            <button
              type="button"
              className="textButton"
              onClick={() => setView('list')}
            >
              Volver
            </button>
            <span>
              {SUBJECT_LABELS[tutor.subject]} · {LEVEL_LABELS[tutor.level]}
            </span>
          </div>

          <div className="fieldGroup">
            <label className="fieldLabel" htmlFor="flashcards-topic">
              Tema <span className="fieldOptional">(opcional)</span>
            </label>
            <input
              id="flashcards-topic"
              className="textInput"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={LIMITS.maxTopicChars}
              placeholder="Ej.: derivadas, ley de Ohm…"
              disabled={busy}
            />
          </div>

          <div className="fieldGroup">
            <span className="fieldLabel">Cantidad</span>
            <div className="countSwitch" role="group" aria-label="Cantidad de tarjetas">
              {([6, 8, 10] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    count === value ? 'countOption isActive' : 'countOption'
                  }
                  aria-pressed={count === value}
                  onClick={() => setCount(value)}
                  disabled={busy}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {latestPdfText ? (
            <label className="checkboxRow">
              <input
                type="checkbox"
                checked={usePdf}
                onChange={(event) => setUsePdf(event.target.checked)}
                disabled={busy}
              />
              <span>
                Usar el último PDF de la conversación
                <small>
                  Se envían hasta {LIMITS.maxSourceTextChars.toLocaleString('es')}{' '}
                  caracteres del texto extraído.
                </small>
              </span>
            </label>
          ) : null}

          {!online ? (
            <p className="fieldHint">
              Sin conexión: podés repasar los decks guardados, pero no generar
              uno nuevo.
            </p>
          ) : null}

          <button
            type="button"
            className="button primary"
            onClick={() => void generate()}
            disabled={busy || !online}
          >
            {busy ? (
              <>
                <span className="spinner small" aria-hidden="true" />
                Generando…
              </>
            ) : (
              <>
                <Icon name="sparkles" size={17} />
                Generar flashcards
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flashcardReview">
          <div className="studyDialogToolbar">
            <button
              type="button"
              className="textButton"
              onClick={() => setView('list')}
            >
              Volver
            </button>
            <span>
              {deck?.title}
              {reviewTotal > 0
                ? ` · ${reviewTotal - queue.length} de ${reviewTotal}`
                : ''}
              {forcedReview && reviewTotal > 0 ? ' · repaso anticipado' : ''}
            </span>
          </div>

          {!current ? (
            reviewTotal === 0 ? (
              <div className="studyEmpty">
                <span className="studyEmptyIcon">
                  <Icon name="check" size={24} />
                </span>
                <h3>Todo al día</h3>
                <p>
                  La próxima tarjeta vence el {nextDueLabel(deck)}. No hace
                  falta reprogramar nada todavía.
                </p>
                {deck ? (
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => startReview(deck, true)}
                  >
                    Repasar igual
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="studyEmpty">
                <span className="studyEmptyIcon">
                  <Icon name="check" size={24} />
                </span>
                <h3>Repaso completo</h3>
                <p>
                  Las tarjetas quedaron programadas según tu respuesta. Volvé
                  cuando toque el próximo repaso.
                </p>
              </div>
            )
          ) : (
            <div className="flashcardCard">
              <p className="eyebrow">Frente</p>
              <p className="flashcardFront">{current.front}</p>
              {revealed ? (
                <div className="flashcardBack" aria-live="polite">
                  <p>{current.back}</p>
                  {current.explanation ? (
                    <p className="flashcardExplanation">
                      {current.explanation}
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className="button primary flashcardReveal"
                  onClick={() => setRevealed(true)}
                >
                  Mostrar respuesta
                </button>
              )}
            </div>
          )}

          {current && revealed ? (
            <div className="flashcardRatings" aria-label="Calificar repaso">
              <button
                type="button"
                className="button ghost"
                onClick={() => void rate('again')}
                disabled={busy}
              >
                Otra vez
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => void rate('good')}
                disabled={busy}
              >
                Bien
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => void rate('easy')}
                disabled={busy}
              >
                Fácil
              </button>
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
