/** Lógica pura del duelo: se puntúa contra un rival simulado. */

export interface DuelQuestion {
  correctIndex: number;
}

/** Respuesta del jugador: índice elegido o null si se agotó el tiempo. */
export type DuelAnswer = number | null;

export interface DuelResult {
  playerScore: number;
  opponentScore: number;
  won: boolean;
  stars: number;
}

/**
 * Computa el resultado. El rival acierta `opponentAccuracy` de las preguntas
 * (redondeado), para que el duelo sea determinista y no dependa de la suerte.
 */
export function scoreDuel(
  questions: DuelQuestion[],
  answers: DuelAnswer[],
  opponentAccuracy = 0.7,
): DuelResult {
  const playerScore = questions.reduce((total, question, index) => {
    const answer = answers[index];
    return total + (answer === question.correctIndex ? 1 : 0);
  }, 0);
  const opponentScore = Math.round(questions.length * opponentAccuracy);
  return {
    playerScore,
    opponentScore,
    won: playerScore > opponentScore,
    stars: playerScore + (playerScore > opponentScore ? 2 : 0),
  };
}
