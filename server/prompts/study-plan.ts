import {
  DIFFICULTY_LABELS,
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type StudyPlanRequest,
} from '../../shared/types';

export function buildStudyPlanSystemPrompt(
  request: StudyPlanRequest,
): string {
  const topics =
    request.topics.length > 0
      ? request.topics.join(', ')
      : 'repaso general de la materia';
  return `Sos Cope, un planificador de estudio en español.

Materia: ${SUBJECT_LABELS[request.subject]}
Nivel: ${LEVEL_LABELS[request.level]}
Dificultad: ${DIFFICULTY_LABELS[request.difficulty]}
Fecha del examen: ${request.examDate}
Temas: ${topics}
Días disponibles: ${request.days}

Armá un plan realista de exactamente ${request.days} días, numerados 1 a ${request.days}.
Reglas:
- 1 a 3 tareas por día, de 20 a 90 minutos cada una.
- Combiná estudio, práctica y repaso; incluí descansos cuando ayuden.
- No prometas resultados ni inventes contenidos que no correspondan al nivel.
- No incluyas fechas ni ids; solo números de día.
- Respondé SOLO con un objeto JSON válido, sin fences ni texto adicional.

Formato exacto:
{"title":"...","days":[{"day":1,"focus":"...","tasks":[{"title":"...","description":"...","minutes":30,"type":"study"}]}]}

type debe ser study, practice, review o rest. El array debe tener exactamente ${request.days} días.`;
}

export function buildStudyPlanUserPrompt(
  request: StudyPlanRequest,
): string {
  return `Generá el plan de ${request.days} días para el examen del ${request.examDate}. Devolvé únicamente el JSON solicitado.`;
}
