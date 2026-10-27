import {
  DEFAULT_PERSONALITY,
  LEVEL_LABELS,
  PERSONALITY_LABELS,
  SUBJECT_LABELS,
  type ChatMessage,
  type Mode,
  type PersonalityConfig,
  type QuizQuestion,
  type Subject,
  type TutorConfig,
} from '../../shared/types.js';
import { abortError } from '../errors.js';

export interface DemoChatInput {
  mode: Mode;
  tutor: TutorConfig;
  personality?: PersonalityConfig;
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
  const personality = input.personality ?? DEFAULT_PERSONALITY;
  const personaLine = `**Personalidad:** ${PERSONALITY_LABELS[personality.preset]} · **Nombre:** ${personality.name}`;
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
    const solver = input.tutor.style === 'solver';
    const header = `Estoy en **modo demo**, así que esta es una respuesta de muestra. Con una clave configurada, el tutor adaptaría el desarrollo a tu consulta real.

**Consulta:** “${summary}”
**Materia:** ${SUBJECT_LABELS[input.tutor.subject]} · **Nivel:** ${LEVEL_LABELS[input.tutor.level]}
**Estilo:** ${solver ? 'Solución completa' : 'Guiado'}
${personaLine}
${attachmentNotes ? `\n${attachmentNotes}\n` : ''}`;

    if (!solver) {
      return `${header}
### 1. Entender qué buscamos
Antes de calcular, identificá los datos y lo que te piden. En un problema de este tipo conviene separar lo conocido de lo que hay que encontrar.

### 2. Elegir una estrategia
Podemos plantear una ecuación sencilla. Si llamamos $x$ al valor desconocido, la relación inicial sería:

$$2x + 5 = 17$$

**Tu turno:** ¿qué operación conviene hacer primero para dejar a $x$ sola? Probá y te corrijo el paso.

**Pista:** podés empezar restando el mismo número en ambos lados.`;
    }

    return `${header}
### 1. Entender qué buscamos
Identificamos los datos y lo que piden. En un problema de este tipo conviene separar lo conocido de lo que hay que encontrar.

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

  return `Estoy en **modo demo**, así que esta es una respuesta de muestra. Con una clave configurada, ${personality.name} respondería con el contenido completo de tu consulta.

**Consulta:** “${summary}”
${personaLine}
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
  q(
    'math',
    6,
    'Si x/3 = 4, ¿cuánto vale x?',
    ['7', '12', '1', '3'],
    1,
    'Multiplicando ambos lados por 3, x = 12.',
  ),
  q(
    'math',
    7,
    '¿Cuánto es 5² − 3²?',
    ['4', '8', '16', '34'],
    2,
    '5² = 25 y 3² = 9. La diferencia es 25 − 9 = 16.',
  ),
  q(
    'math',
    8,
    '¿Cuál es el 25 % de 80?',
    ['10', '20', '25', '40'],
    1,
    'El 25 % es un cuarto del total: 80 / 4 = 20.',
  ),
  q(
    'math',
    9,
    '¿Cuál es el perímetro de un cuadrado de 6 cm de lado?',
    ['12 cm', '24 cm', '36 cm', '6 cm'],
    1,
    'Un cuadrado tiene cuatro lados iguales: 4 × 6 cm = 24 cm.',
  ),
  q(
    'math',
    10,
    'Si 2(x − 3) = 10, ¿cuál es el valor de x?',
    ['2', '5', '8', '13'],
    2,
    'Dividiendo por 2 queda x − 3 = 5. Sumando 3, x = 8.',
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
  q(
    'physics',
    6,
    'Una fuerza de 10 N desplaza un objeto 3 m en su dirección. ¿Qué trabajo realiza?',
    ['3 J', '10 J', '30 J', '60 J'],
    2,
    'El trabajo es fuerza por distancia: W = 10 N × 3 m = 30 J.',
  ),
  q(
    'physics',
    7,
    'Una masa de 6 g ocupa 2 cm³. ¿Cuál es su densidad?',
    ['3 g/cm³', '12 g/cm³', '0,33 g/cm³', '8 g/cm³'],
    0,
    'La densidad es masa dividida volumen: 6 g / 2 cm³ = 3 g/cm³.',
  ),
  q(
    'physics',
    8,
    'Un dispositivo consume 60 J en 3 s. ¿Cuál es su potencia media?',
    ['20 W', '63 W', '180 W', '3 W'],
    0,
    'La potencia es energía dividida tiempo: 60 J / 3 s = 20 W.',
  ),
  q(
    'physics',
    9,
    'Una onda tiene velocidad 20 m/s y frecuencia 5 Hz. ¿Cuál es su longitud de onda?',
    ['4 m', '15 m', '25 m', '100 m'],
    0,
    'La longitud de onda es velocidad dividida frecuencia: 20 / 5 = 4 m.',
  ),
  q(
    'physics',
    10,
    'Un objeto de 2 kg se mueve a 5 m/s. ¿Cuál es su momento lineal?',
    ['2,5 kg·m/s', '7 kg·m/s', '10 kg·m/s', '20 kg·m/s'],
    2,
    'El momento lineal es masa por velocidad: p = 2 kg × 5 m/s = 10 kg·m/s.',
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
  q(
    'chemistry',
    6,
    '¿Cuántos átomos hay en una molécula de H₂O?',
    ['2', '3', '4', '1'],
    1,
    'Hay dos átomos de hidrógeno y uno de oxígeno: 2 + 1 = 3.',
  ),
  q(
    'chemistry',
    7,
    'Un elemento con número atómico 6 es:',
    ['Carbono', 'Oxígeno', 'Nitrógeno', 'Helio'],
    0,
    'El número atómico 6 corresponde al carbono, que tiene 6 protones.',
  ),
  q(
    'chemistry',
    8,
    'Un enlace covalente se forma cuando los átomos:',
    ['Transfieren electrones', 'Comparten electrones', 'Pierden protones', 'Comparten neutrones'],
    1,
    'En un enlace covalente los átomos comparten pares de electrones.',
  ),
  q(
    'chemistry',
    9,
    '¿Cuántas partículas hay, aproximadamente, en 1 mol de sustancia?',
    ['6,022 × 10²³', '1 × 10²³', '3,14 × 10²³', '9,8 × 10²³'],
    0,
    'Un mol contiene el número de Avogadro: aproximadamente 6,022 × 10²³ partículas.',
  ),
  q(
    'chemistry',
    10,
    'Una solución con pH 7 es:',
    ['Ácida', 'Neutra', 'Básica', 'Salina'],
    1,
    'A 25 °C, un pH de 7 se considera neutro.',
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
  q(
    'general',
    6,
    'La técnica Pomodoro alterna bloques de estudio con:',
    ['Series de televisión', 'Descansos breves', 'Siestas largas', 'Mensajes sin límite'],
    1,
    'Pomodoro usa bloques cortos de concentración seguidos de pausas breves.',
  ),
  q(
    'general',
    7,
    '¿Cuánto sueño suele recomendar la evidencia para adultos?',
    ['3 a 4 horas', '5 a 6 horas', '7 a 9 horas', '12 horas'],
    2,
    'La mayoría de los adultos necesita entre 7 y 9 horas de sueño para rendir y consolidar lo aprendido.',
  ),
  q(
    'general',
    8,
    'Explicar un tema a otra persona es útil porque:',
    ['Solo repite el texto', 'Obliga a recuperarlo y organizarlo', 'Evita practicar', 'Reemplaza dormir'],
    1,
    'Enseñar exige recuperar la información y estructurarla, lo que revela lagunas y refuerza el aprendizaje.',
  ),
  q(
    'general',
    9,
    'Un plan de estudio realista divide las tareas grandes en:',
    ['Tareas más pequeñas y concretas', 'Una sola sesión', 'Temas sin fecha', 'Descansos permanentes'],
    0,
    'Dividir en pasos pequeños y concretos facilita empezar, medir el avance y mantener la constancia.',
  ),
  q(
    'general',
    10,
    'Al evaluar una fuente, conviene revisar:',
    ['Solo el título', 'Autor, fecha y evidencias', 'La cantidad de emojis', 'Si es la primera búsqueda'],
    1,
    'Revisar autoría, fecha y evidencias ayuda a distinguir información confiable de contenido sin respaldo.',
  ),
];

const QUIZ_BANKS: Record<Subject, QuizQuestion[]> = {
  math: MATH_QUIZ,
  physics: PHYSICS_QUIZ,
  chemistry: CHEMISTRY_QUIZ,
  general: GENERAL_QUIZ,
};

export function demoQuiz(subject: Subject, count = 5): QuizQuestion[] {
  return QUIZ_BANKS[subject].slice(0, count).map((question) => ({
    ...question,
    options: [...question.options] as QuizQuestion['options'],
  }));
}
