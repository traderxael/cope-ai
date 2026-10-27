export type OralZone = 'segura' | 'practica' | 'refuerzo';

export function oralOverallScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round((total / (scores.length * 5)) * 100);
}

export function oralZoneForScore(score: number): OralZone {
  if (score >= 80) return 'segura';
  if (score >= 55) return 'practica';
  return 'refuerzo';
}
