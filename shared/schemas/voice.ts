export const EdgeVoice = {
  esAR: 'es-AR-ElenaNeural',
  esAR_M: 'es-AR-TomasNeural',
  esCL: 'es-CL-CatalinaNeural',
  esCL_M: 'es-CL-LorenzoNeural',
  esCO: 'es-CO-GonzaloNeural',
  esCO_M: 'es-CO-SalomeNeural',
  esES: 'es-ES-AlvaroNeural',
  esES_F: 'es-ES-ElviraNeural',
  esES_F2: 'es-ES-XimenaNeural',
  esMX: 'es-MX-DaliaNeural',
  esMX_M: 'es-MX-JorgeNeural',
  // … (continuar con todas las voces listadas en la investigación)
} as const;

export type EdgeVoice = typeof EdgeVoice[keyof typeof EdgeVoice];