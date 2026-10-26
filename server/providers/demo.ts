import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type ChatMessage,
  type Mode,
  type QuizQuestion,
  type Subject,
  type TutorConfig,
} from '../../shared/types';
import { abortError } from '../errors';

export interface DemoChatInput {
  mode: Mode;
  tutor: TutorConfig;
  messages: ChatMessage[];
  hasImages: boolean;
  hasDocument: boolean;
}

function textFromContent(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function lastUserText(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user') return textFromContent(message.content);
  }
  return '';
}

function summarize(text: string, max = 180): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return 'tu consulta';
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

export function buildDemoAnswer(input: DemoChatInput): string {
  const summary = summarize(lastUserText(input.messages));
  const attachmentNotes = [
    input.hasImages
      ? '> Recibí una imagen. En modo demo no puedo analizarla; con un modelo con visión se enviaría como contexto.'
      : '',
    input.hasDocument
      ? '> Recibí un documento. En modo demo no lo analizo; en el modo real usaría su texto como material de referencia.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (input.mode === 'tutor') {
    return `Estoy en **modo demo**, así que esta es una respuesta de muestra. Con una clave configurada, el tutor adaptaría el desarrollo a tu consulta real.

**Consulta:** “${summary}”
**Materia:** ${SUBJECT_LABELS[input.tutor.subject]} · **Nivel:** ${LEVEL_LABELS[input.tutor.level]}
${attachmentNotes ? `\n${attachmentNotes}\n` : ''}
### 1. Entender qué buscamos
Antes de calcular, identificá los datos y lo que te piden. En un problema de este tipo conviene separar lo conocido de lo que hay que encontrar.

### 2. Elegir una estrategia
Podemos resolverlo con una ecuación sencilla. Si llamamos $x$ al valor desconocido, planteamos una relación entre los datos y lo que queremos obtener.

### 3. Resolver paso a paso
Supongamos que la relación es:

$$2x + 5 = 17$$

Restamos 5 en ambos lados para aislar el término con $x$:

$$2x = 12$$

Dividimos por 2:

$$x = 6$$

### Comprobación
Reemplazá el valor en la ecuación original: $2 \\cdot 6 + 5 = 17$. El resultado coincide, así que la solución es coherente.

**Para comprobar tu comprensión:** ¿qué operación harías si en lugar de $+5$ la ecuación tuviera $-3$?`;
  }

  return `Estoy en **modo demo**, así que esta es una respuesta de muestra. Con una clave configurada, Cope respondería con el contenido completo de tu consulta.

**Consulta:** “${summary}”
${attachmentNotes ? `\n${attachmentNotes}\n` : ''}
### Una forma de encararlo
1. **Aclarar el objetivo:** definir qué resultado necesitás y qué restricciones tenés.
2. **Separar en partes:** dividir el problema en pasos pequeños y verificables.
3. **Elegir una herramienta:** usar el enfoque más simple que resuelva el problema, sin agregar complejidad innecesaria.
4. **Comprobar:** revisar el resultado con un caso concreto antes de darlo por terminado.

Un pequeño ejemplo de cómo estructurar los pasos:

\`\`\`ts
const pasos = ['entender', 'resolver', 'comprobar'];
console.log(pasos.join(' → '));
\`\`\`

Este modo demo sirve para recorrer la interfaz, el streaming, el historial y la práctica. Para respuestas reales, configurá \`OPENAI_API_KEY\` y \`OPENAI_MODEL\` en tu \`.env.local\`.`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function* streamDemoChat(
  answer: string,
  options: { signal?: AbortSignal; delayMs?: number } = {},
): AsyncGenerator<string> {
  const delayMs = options.delayMs ?? 15;
  const words = answer.match(/\S+\s*/g) ?? [answer];
  let buffer = '';

  for (const word of words) {
    if (options.signal?.aborted) throw abortError();
    buffer += word;
    if (buffer.length >= 18) {
      yield buffer;
      buffer = '';
      await sleep(delayMs, options.signal);
    }
  }
  if (buffer) yield buffer;
}

function q(
  subject: Subject,
  index: number,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explanation: string,
): QuizQuestion {
  return {
    id: `demo-${subject}-${index}`,
    prompt,
    options,
    correctIndex,
    explanation,
  };
}

const MATH_QUIZ: QuizQuestion[] = [
  q(
    'math',
    1,
    'Si 2x + 5 = 17, ¿cuál es el valor de x?',
    ['x = 4', 'x = 6', 'x = 8', 'x = 11'],
    1,
    'Restando 5 en ambos lados queda 2x = 12. Al dividir por 2, x = 6.',
  ),
  q(
    'math',
    2,
    '¿Cuál es el área de un triángulo con base 10 cm y altura 6 cm?',
    ['20 cm²', '30 cm²', '60 cm²', '80 cm²'],
    1,
    'El área de un triángulo es base por altura dividido 2: (10 × 6) / 2 = 30 cm².',
  ),
  q(
    'math',
    3,
    '¿Cuánto es 3/4 + 1/8?',
    ['4/12', '7/8', '1/2', '5/8'],
    1,
    'Convertimos 3/4 a octavos: 6/8. Luego 6/8 + 1/8 = 7/8.',
  ),
  q(
    'math',
    4,
    '¿Cuál es la pendiente de la recta que pasa por (1, 2) y (3, 8)?',
    ['2', '3', '4', '6'],
    1,
    'La pendiente es el cambio en y dividido el cambio en x: (8 − 2) / (3 − 1) = 6 / 2 = 3.',
  ),
  q(
    'math',
    5,
    '¿Cuál es la factorización de x² − 9?',
    ['(x − 3)(x + 3)', '(x − 9)(x + 1)', '(x − 3)²', '(x + 3)²'],
    0,
    'Es una diferencia de cuadrados: a² − b² = (a − b)(a + b). Con a = x y b = 3, queda (x − 3)(x + 3).',
  ),
];

const PHYSICS_QUIZ: QuizQuestion[] = [
  q(
    'physics',
    1,
    'Un objeto recorre 100 m en 20 s. ¿Cuál es su velocidad media?',
    ['2 m/s', '5 m/s', '20 m/s', '100 m/s'],
    1,
    'La velocidad media es distancia dividida tiempo: 100 m / 20 s = 5 m/s.',
  ),
  q(
    'physics',
    2,
    'Si una masa de 2 kg acelera a 3 m/s², ¿qué fuerza neta actúa sobre ella?',
    ['1,5 N', '5 N', '6 N', '9 N'],
    2,
    'Por la segunda ley de Newton, F = m · a = 2 kg × 3 m/s² = 6 N.',
  ),
  q(
    'physics',
    3,
    '¿Cuál es la energía cinética de un objeto de 4 kg que se mueve a 3 m/s?',
    ['6 J', '12 J', '18 J', '36 J'],
    2,
    'La energía cinética es (1/2)mv² = 0,5 × 4 × 3² = 18 J.',
  ),
  q(
    'physics',
    4,
    'Si por una resistencia de 5 Ω circula una corriente de 2 A, ¿cuál es la tensión?',
    ['2,5 V', '7 V', '10 V', '20 V'],
    2,
    'Por la ley de Ohm, V = I · R = 2 A × 5 Ω = 10 V.',
  ),
  q(
    'physics',
    5,
    'Un objeto cae libremente durante 2 s (g = 9,8 m/s²). ¿Qué velocidad alcanza?',
    ['4,9 m/s', '9,8 m/s', '19,6 m/s', '39,2 m/s'],
    2,
    'La velocidad es v = g · t = 9,8 m/s² × 2 s = 19,6 m/s, despreciando el aire.',
  ),
];

const CHEMISTRY_QUIZ: QuizQuestion[] = [
  q(
    'chemistry',
    1,
    '¿Qué indica el número atómico de un elemento?',
    ['La cantidad de neutrones', 'La cantidad de protones', 'La cantidad de enlaces', 'La masa molecular'],
    1,
    'El número atómico es la cantidad de protones del núcleo y define al elemento.',
  ),
  q(
    'chemistry',
    2,
    '¿Cuál es la masa molar del agua (H₂O), con H = 1 g/mol y O = 16 g/mol?',
    ['16 g/mol', '18 g/mol', '20 g/mol', '36 g/mol'],
    1,
    'Hay dos hidrógenos y un oxígeno: 2 × 1 + 16 = 18 g/mol.',
  ),
  q(
    'chemistry',
    3,
    'Una solución con pH 3 es:',
    ['Ácida', 'Neutra', 'Básica', 'Salina'],
    0,
    'Un pH menor que 7 indica una solución ácida; 3 es más ácido que 7.',
  ),
  q(
    'chemistry',
    4,
    'En 2H₂ + O₂ → 2H₂O, ¿cuál es el coeficiente del hidrógeno?',
    ['1', '2', '3', '4'],
    1,
    'El coeficiente que balancea la ecuación delante de H₂ es 2.',
  ),
  q(
    'chemistry',
    5,
    'Al disolver sal común (NaCl) en agua, se forman principalmente:',
    ['Moléculas de NaCl', 'Iones Na⁺ y Cl⁻', 'Átomos neutros de Na y Cl', 'Protones libres'],
    1,
    'El NaCl es un compuesto iónico: en agua se disocia en iones Na⁺ y Cl⁻.',
  ),
];

const GENERAL_QUIZ: QuizQuestion[] = [
  q(
    'general',
    1,
    '¿Cuál es una estrategia de estudio respaldada por la evidencia?',
    ['Repasar todo una sola vez', 'Distribuir los repasos en varios días', 'Leer sin tomar notas', 'Estudiar solo la noche anterior'],
    1,
    'La práctica espaciada distribuye los repasos en el tiempo y mejora la retención a largo plazo.',
  ),
  q(
    'general',
    2,
    '¿Qué técnica ayuda a comprobar si realmente entendiste un tema?',
    ['Releer el apunte', 'Explicarlo de memoria y verificar', 'Copiar el texto', 'Escuchar música mientras estudiás'],
    1,
    'La recuperación activa consiste en traer la información sin mirar y luego comprobar; revela lagunas que la relectura oculta.',
  ),
  q(
    'general',
    3,
    'Un buen resumen para estudiar debería:',
    ['Copiar palabra por palabra', 'Usar tus propias palabras', 'Incluir absolutamente todo', 'Evitar ejemplos'],
    1,
    'Parafrasear obliga a procesar el contenido y a distinguir las ideas principales de los detalles.',
  ),
  q(
    'general',
    4,
    'Al investigar un tema, ¿qué conviene hacer?',
    ['Usar una sola fuente', 'Contrastar varias fuentes confiables', 'Confiar solo en una red social', 'Evitar verificar'],
    1,
    'Contrastar fuentes confiables permite detectar errores, sesgos y desacuerdos antes de sacar conclusiones.',
  ),
  q(
    'general',
    5,
    '¿Qué organización del tiempo suele sostener mejor la concentración?',
    ['Ocho horas sin pausas', 'Alternar bloques de estudio y descansos', 'No descansar nunca', 'Cambiar de tema cada minuto'],
    1,
    'Alternar bloques de estudio con pausas breves reduce la fatiga y ayuda a mantener la atención.',
  ),
];

const QUIZ_BANKS: Record<Subject, QuizQuestion[]> = {
  math: MATH_QUIZ,
  physics: PHYSICS_QUIZ,
  chemistry: CHEMISTRY_QUIZ,
  general: GENERAL_QUIZ,
};

export function demoQuiz(subject: Subject): QuizQuestion[] {
  return QUIZ_BANKS[subject].map((question) => ({
    ...question,
    options: [...question.options] as QuizQuestion['options'],
  }));
}
