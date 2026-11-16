/**
 * Catálogo de temas de aprendizaje. Contenido original redactado a partir de
 * fuentes públicas consultadas; cada tema cita su fuente sin copiar el texto.
 */

export type TopicArea = 'tecnologia' | 'ciencias' | 'humanidades';

export interface Topic {
  id: string;
  label: string;
  area: TopicArea;
  /** Nombre de un ícono existente en IconName. */
  icon: string;
  what: string;
  how: string;
  example: string;
  source: { label: string; url: string };
}

export const AREAS: Array<{ id: TopicArea; label: string; description: string }> = [
  {
    id: 'tecnologia',
    label: 'Tecnología',
    description: 'Cómo funcionan las máquinas y la inteligencia artificial.',
  },
  {
    id: 'ciencias',
    label: 'Ciencias',
    description: 'Las leyes de la naturaleza y los métodos para estudiarla.',
  },
  {
    id: 'humanidades',
    label: 'Humanidades',
    description: 'Cultura, sociedad y la forma en que entendemos el pasado.',
  },
];

export const TOPICS: Topic[] = [
  {
    id: 'motores-reaccion',
    label: 'Motores de reacción',
    area: 'tecnologia',
    icon: 'settings',
    what: 'Un motor de reacción genera empuje expulsando un chorro de fluido a alta velocidad. Su principio es la tercera ley de Newton: al acelerar el gas hacia atrás, el motor recibe un empuje hacia delante. Incluye turborreactores, turbofanes, estatorreactores y motores cohete.',
    how: 'En un turborreactor el aire entra por la toma, se comprime, se mezcla con combustible y arde en la cámara de combustión. Los gases calientes mueven la turbina —que acciona el compresor— y salen por la tobera a gran velocidad. La turbina extrae solo parte de la energía: el resto se convierte en empuje.',
    example: 'El turbofán de un avión de línea mueve un gran flujo de aire a menor velocidad: es más silencioso y eficiente en vuelo subsónico que un reactor puro.',
    source: {
      label: 'Wikipedia: Motor de reacción',
      url: 'https://es.wikipedia.org/wiki/Motor_de_reacci%C3%B3n',
    },
  },
  {
    id: 'computacion',
    label: 'Computación',
    area: 'tecnologia',
    icon: 'monitor',
    what: 'Las ciencias de la computación estudian los fundamentos teóricos de la información y el cómputo, y sus aplicaciones prácticas. Su pregunta central, según Peter Denning, es: ¿qué puede ser automatizado eficientemente?',
    how: 'Se organizan alrededor de los procesos algorítmicos: análisis de algoritmos y estructuras de datos, teoría de la computación, lenguajes de programación y áreas aplicadas como inteligencia artificial, redes y bases de datos. Un algoritmo es una secuencia finita de pasos que transforma una entrada en una salida.',
    example: 'Ordenar una lista de nombres parece trivial, pero elegir el algoritmo adecuado —como ordenación rápida en vez de burbuja— cambia radicalmente el tiempo cuando la lista tiene millones de entradas.',
    source: {
      label: 'Wikipedia: Ciencias de la computación',
      url: 'https://es.wikipedia.org/wiki/Ciencias_de_la_computaci%C3%B3n',
    },
  },
  {
    id: 'inteligencia-artificial',
    label: 'Inteligencia artificial',
    area: 'tecnologia',
    icon: 'sparkles',
    what: 'La inteligencia artificial es una disciplina de la computación que crea sistemas capaces de imitar funciones cognitivas humanas: percibir, razonar, aprender y resolver problemas.',
    how: 'La IA moderna se apoya en aprendizaje automático: en lugar de programar reglas a mano, el sistema ajusta sus parámetros a partir de datos. Las redes neuronales artificiales, el procesamiento de lenguaje natural y la visión por computadora son algunas de sus herramientas. Se distingue la IA débil —tareas específicas— de la IA general, aún hipotética.',
    example: 'Un asistente virtual que transcribe tu voz, interpreta la intención y responde combina reconocimiento de habla, comprensión del lenguaje y generación de texto.',
    source: {
      label: 'Wikipedia: Inteligencia artificial',
      url: 'https://es.wikipedia.org/wiki/Inteligencia_artificial',
    },
  },
  {
    id: 'fisica',
    label: 'Física',
    area: 'ciencias',
    icon: 'atom',
    what: 'La física es la ciencia natural que estudia la materia, la energía, la fuerza, el movimiento y el espacio-tiempo, desde las partículas subatómicas hasta el origen del universo.',
    how: 'Formula leyes matemáticas que describen cómo se comporta la naturaleza y las contrasta con experimentos. Newton unificó la caída de los cuerpos y el movimiento planetario con la gravedad; Faraday unió electricidad y magnetismo; Einstein reformuló el espacio y el tiempo con la relatividad.',
    example: 'Al frenar un auto, la segunda ley de Newton (F = m·a) permite calcular la fuerza de frenado necesaria según la masa y la desaceleración.',
    source: {
      label: 'Wikipedia: Física',
      url: 'https://es.wikipedia.org/wiki/F%C3%ADsica',
    },
  },
  {
    id: 'ciencias-naturales',
    label: 'Ciencias naturales',
    area: 'ciencias',
    icon: 'flask',
    what: 'Las ciencias naturales estudian la naturaleza mediante el método científico empírico-analítico. Se dividen clásicamente en cinco ramas: física, química, astronomía, geología y biología.',
    how: 'Observan, formulan hipótesis, experimentan y contrastan resultados. Sus fronteras son difusas: de la física nacen la astrofísica y la biofísica; de la química, la bioquímica y la geoquímica. La ciencia ambiental integra componentes físicos, químicos y biológicos.',
    example: 'El cambio climático se estudia combinando física de la atmósfera, química del carbono y biología de los ecosistemas: un problema típicamente interdisciplinar.',
    source: {
      label: 'Wikipedia: Ciencias naturales',
      url: 'https://es.wikipedia.org/wiki/Ciencias_naturales',
    },
  },
  {
    id: 'artes',
    label: 'Artes',
    area: 'humanidades',
    icon: 'image',
    what: 'El arte es una actividad o producto humano con finalidad estética y comunicativa: expresa ideas, emociones y una visión del mundo mediante recursos plásticos, sonoros, lingüísticos o corporales.',
    how: 'Su definición es abierta y ha cambiado con cada época: de la destreza artesanal griega a las bellas artes del Renacimiento, y del arte moderno —que explora el mundo interior— a formas contemporáneas como el cine, el cómic o los videojuegos.',
    example: "Mirar 'Las Meninas' de Velázquez no es solo ver una escena: es estudiar cómo el pintor se incluye a sí mismo y juega con la mirada del espectador.",
    source: {
      label: 'Wikipedia: Arte',
      url: 'https://es.wikipedia.org/wiki/Arte',
    },
  },
  {
    id: 'historia',
    label: 'Historia',
    area: 'humanidades',
    icon: 'calendar',
    what: 'La historia es la narración y el estudio del pasado humano. Como disciplina, investiga los hechos y procesos ocurridos e intenta interpretarlos con la mayor objetividad posible.',
    how: 'El historiador trabaja con fuentes: documentos escritos, restos arqueológicos, testimonios orales e imágenes. Las contrasta críticamente y las sitúa en contexto. Se organiza por periodos —prehistoria, antigua, media, moderna y contemporánea— y por áreas como la política, la economía o la cultura.',
    example: 'La caída del Imperio romano no se explica con un solo hecho: se cruzan datos militares, fiscales, climáticos y sociales de distintas fuentes.',
    source: {
      label: 'Wikipedia: Historia',
      url: 'https://es.wikipedia.org/wiki/Historia',
    },
  },
  {
    id: 'economia',
    label: 'Economía',
    area: 'humanidades',
    icon: 'chart',
    what: 'La economía estudia cómo se producen, distribuyen, comercian y consumen bienes y servicios. En sentido estricto, es la asignación de recursos escasos para satisfacer necesidades.',
    how: 'Adam Smith formuló la idea de que los precios surgen de la interacción entre oferta y demanda y que la división del trabajo aumenta la productividad. La microeconomía analiza a consumidores y empresas; la macroeconomía estudia el conjunto de la economía: inflación, desempleo y crecimiento.',
    example: 'Si sube el precio del café, la demanda suele bajar y los productores tienden a ofrecer más: esa interacción mueve el precio hacia un equilibrio.',
    source: {
      label: 'Wikipedia: Economía',
      url: 'https://es.wikipedia.org/wiki/Econom%C3%ADa',
    },
  },
];

export function topicsByArea(area: TopicArea): Topic[] {
  return TOPICS.filter((topic) => topic.area === area);
}
