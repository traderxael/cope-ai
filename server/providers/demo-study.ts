import type { FlashcardContentCard } from '../../shared/schemas/study.js';
import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type StudyPlanContent,
  type StudyPlanRequest,
  type Subject,
} from '../../shared/types.js';

const MATH_CARDS: FlashcardContentCard[] = [
  {
    front: '¿Qué representa la derivada de una función en un punto?',
    back: 'La tasa de cambio instantánea: cuánto cambia la salida por cada cambio muy pequeño en la entrada.',
    explanation: 'Geométricamente es la pendiente de la recta tangente en ese punto.',
  },
  {
    front: 'Regla de la potencia para derivar xⁿ',
    back: 'd/dx xⁿ = n · xⁿ⁻¹, para n distinto de 0.',
    explanation: 'Se multiplica por el exponente y se reduce el exponente en uno.',
  },
  {
    front: 'Fórmula general de una ecuación cuadrática',
    back: 'x = (−b ± √(b² − 4ac)) / 2a para ax² + bx + c = 0.',
    explanation: 'El discriminante b² − 4ac indica cuántas soluciones reales hay.',
  },
  {
    front: 'Teorema de Pitágoras',
    back: 'En un triángulo rectángulo, a² + b² = c², donde c es la hipotenusa.',
    explanation: 'Solo aplica a triángulos rectángulos.',
  },
  {
    front: 'Área de un triángulo',
    back: 'Área = (base × altura) / 2.',
  },
  {
    front: 'Pendiente entre dos puntos',
    back: 'm = (y₂ − y₁) / (x₂ − x₁).',
    explanation: 'Mide cuánto sube o baja la recta por cada unidad horizontal.',
  },
  {
    front: '¿Cómo se suman fracciones con distinto denominador?',
    back: 'Se busca un denominador común, se convierten las fracciones y se suman los numeradores.',
    explanation: 'Por ejemplo, 3/4 + 1/8 = 6/8 + 1/8 = 7/8.',
  },
  {
    front: '¿Cómo se calcula un porcentaje?',
    back: 'Se multiplica el total por el porcentaje y se divide por 100.',
    explanation: 'El 25 % de 80 es 80 × 25 / 100 = 20.',
  },
  {
    front: 'Perímetro de un cuadrado',
    back: 'Perímetro = 4 × lado.',
  },
  {
    front: 'Diferencia de cuadrados',
    back: 'a² − b² = (a − b)(a + b).',
  },
];

const PHYSICS_CARDS: FlashcardContentCard[] = [
  {
    front: 'Segunda ley de Newton',
    back: 'La fuerza neta es igual a la masa por la aceleración: F = m · a.',
    explanation: 'Una misma fuerza produce menos aceleración en una masa mayor.',
  },
  {
    front: 'Velocidad media',
    back: 'v = distancia recorrida / tiempo empleado.',
  },
  {
    front: 'Energía cinética',
    back: 'Ec = ½ · m · v².',
  },
  {
    front: 'Ley de Ohm',
    back: 'V = I · R: tensión = corriente × resistencia.',
  },
  {
    front: 'Trabajo mecánico',
    back: 'W = F · d · cos θ, donde θ es el ángulo entre fuerza y desplazamiento.',
    explanation: 'Si la fuerza es perpendicular al desplazamiento, el trabajo es cero.',
  },
  {
    front: 'Densidad',
    back: 'ρ = masa / volumen.',
  },
  {
    front: 'Potencia media',
    back: 'P = energía o trabajo / tiempo.',
  },
  {
    front: 'Relación entre velocidad, frecuencia y longitud de onda',
    back: 'v = f · λ.',
  },
  {
    front: 'Momento lineal',
    back: 'p = m · v.',
  },
  {
    front: 'Caída libre',
    back: 'Sin resistencia del aire, la aceleración es g (≈ 9,8 m/s²) y v = g · t.',
  },
];

const CHEMISTRY_CARDS: FlashcardContentCard[] = [
  {
    front: 'Número atómico',
    back: 'Cantidad de protones del núcleo; define al elemento.',
  },
  {
    front: 'Masa molar del agua',
    back: '18 g/mol, usando H = 1 g/mol y O = 16 g/mol.',
    explanation: '2 × 1 + 16 = 18 g/mol.',
  },
  {
    front: '¿Qué indica un pH menor que 7?',
    back: 'Una solución ácida.',
  },
  {
    front: '¿Qué es un mol?',
    back: 'Una cantidad de sustancia que contiene aproximadamente 6,022 × 10²³ partículas.',
  },
  {
    front: 'Enlace covalente',
    back: 'Unión en la que dos átomos comparten electrones.',
  },
  {
    front: 'Enlace iónico',
    back: 'Transferencia de electrones entre átomos, formando iones con cargas opuestas.',
  },
  {
    front: '¿Qué se conserva al balancear una ecuación química?',
    back: 'La cantidad de átomos de cada elemento.',
  },
  {
    front: 'Disociación del NaCl en agua',
    back: 'Se separa en iones Na⁺ y Cl⁻.',
  },
  {
    front: '¿Qué mide la masa molar?',
    back: 'La masa de un mol de una sustancia, en g/mol.',
  },
  {
    front: 'Estados de la materia',
    back: 'Sólido, líquido y gaseoso, además de estados como el plasma.',
  },
];

const GENERAL_CARDS: FlashcardContentCard[] = [
  {
    front: 'Práctica espaciada',
    back: 'Distribuir los repasos en varios días en lugar de concentrarlos en una sola sesión.',
    explanation: 'Mejora la retención a largo plazo.',
  },
  {
    front: 'Recuperación activa',
    back: 'Traer la información de memoria sin mirar y después comprobar.',
  },
  {
    front: 'Técnica Pomodoro',
    back: 'Alternar bloques cortos de concentración con pausas breves.',
  },
  {
    front: '¿Cómo hacer un resumen útil?',
    back: 'Usar tus propias palabras, incluir ideas principales y ejemplos, y evitar copiar todo.',
  },
  {
    front: 'Planificación de estudio',
    back: 'Dividir metas grandes en tareas pequeñas con fecha y duración.',
  },
  {
    front: 'Sueño y aprendizaje',
    back: 'Dormir lo suficiente (7–9 h en adultos) ayuda a consolidar lo aprendido.',
  },
  {
    front: 'Evaluar una fuente',
    back: 'Revisar autoría, fecha, evidencias y posibles sesgos.',
  },
  {
    front: 'Enseñar para aprender',
    back: 'Explicar un tema a otra persona obliga a recuperarlo y organizarlo.',
  },
  {
    front: '¿Qué hacer si no entendés un tema?',
    back: 'Identificar el paso exacto que falla, pedir una pista y practicar un caso más simple.',
  },
  {
    front: 'Autoevaluación',
    back: 'Hacer preguntas de práctica y revisar los errores para ajustar el estudio.',
  },
];

const FLASHCARD_BANKS: Record<Subject, FlashcardContentCard[]> = {
  math: MATH_CARDS,
  physics: PHYSICS_CARDS,
  chemistry: CHEMISTRY_CARDS,
  biology: GENERAL_CARDS,
  spanish: GENERAL_CARDS,
  english: GENERAL_CARDS,
  german: GENERAL_CARDS,
  french: GENERAL_CARDS,
  history: GENERAL_CARDS,
  geography: GENERAL_CARDS,
  economics: GENERAL_CARDS,
  computerScience: GENERAL_CARDS,
  philosophy: GENERAL_CARDS,
  psychology: GENERAL_CARDS,
  general: GENERAL_CARDS,
};

export function demoFlashcards(
  subject: Subject,
  count: number,
): FlashcardContentCard[] {
  return FLASHCARD_BANKS[subject].slice(0, count).map((card) => ({ ...card }));
}

export function demoStudyPlan(request: StudyPlanRequest): StudyPlanContent {
  const topics =
    request.topics.length > 0
      ? request.topics
      : [
          `${SUBJECT_LABELS[request.subject]} · fundamentos`,
          `${SUBJECT_LABELS[request.subject]} · práctica`,
          `${SUBJECT_LABELS[request.subject]} · repaso`,
        ];

  const days = Array.from({ length: request.days }, (_, index) => {
    const day = index + 1;
    const focus = topics[index % topics.length] ?? 'repaso general';
    const isReviewDay = day % 3 === 0;
    const isLightDay = day === request.days && request.days > 3;
    const tasks = isLightDay
      ? [
          {
            title: `Repaso final: ${focus}`,
            description: 'Repasá los errores anteriores y hacé una práctica corta.',
            minutes: 30,
            type: 'review' as const,
          },
          {
            title: 'Descanso activo',
            description: 'Cortá el estudio y dormí bien antes del examen.',
            minutes: 20,
            type: 'rest' as const,
          },
        ]
      : isReviewDay
        ? [
            {
              title: `Repaso espaciado: ${focus}`,
              description: 'Recuperá lo estudiado sin mirar y comprobá después.',
              minutes: 25,
              type: 'review' as const,
            },
            {
              title: `Práctica de ${focus}`,
              description: 'Resolvé ejercicios y anotá los errores.',
              minutes: 35,
              type: 'practice' as const,
            },
          ]
        : [
            {
              title: `Estudiar: ${focus}`,
              description: 'Leé o mirá el material y explicá la idea principal con tus palabras.',
              minutes: 40,
              type: 'study' as const,
            },
            {
              title: `Practicar: ${focus}`,
              description: 'Hacé al menos dos ejercicios y comprobá el resultado.',
              minutes: 30,
              type: 'practice' as const,
            },
          ];

    return { day, focus, tasks };
  });

  return {
    title: `Plan de ${SUBJECT_LABELS[request.subject]} (${LEVEL_LABELS[request.level]})`,
    days,
  };
}
