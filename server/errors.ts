export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function providerStatusError(
  status: number,
  hasImages: boolean,
): AppError {
  if (status === 401 || status === 403) {
    return new AppError(
      502,
      'provider_auth',
      'El proveedor rechazó la configuración. Revisá la clave y el modelo.',
    );
  }
  if (status === 404) {
    return new AppError(
      502,
      'provider_model',
      'El modelo configurado no está disponible en el proveedor.',
    );
  }
  if ((status === 400 || status === 422) && hasImages) {
    return new AppError(
      422,
      'vision_unsupported',
      'El modelo elegido no aceptó la imagen. Probá sin adjuntos o configurá un modelo con visión.',
    );
  }
  if (status === 400 || status === 422) {
    return new AppError(
      422,
      'provider_rejected',
      'El proveedor rechazó la solicitud. Revisá el modelo y la configuración.',
    );
  }
  if (status === 429) {
    return new AppError(
      429,
      'provider_rate_limited',
      'El proveedor está limitando las solicitudes. Esperá unos segundos y probá de nuevo.',
    );
  }
  if (status >= 500) {
    return new AppError(
      502,
      'provider_error',
      'El proveedor no respondió correctamente. Probá de nuevo en un momento.',
    );
  }
  return new AppError(
    502,
    'provider_error',
    'No se pudo completar la solicitud con el proveedor.',
  );
}

export interface ErrorDescription {
  status: number;
  code: string;
  message: string;
}

export function describeError(error: unknown): ErrorDescription {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
    };
  }
  if (isAbortError(error)) {
    return {
      status: 408,
      code: 'request_aborted',
      message: 'La solicitud se canceló.',
    };
  }
  return {
    status: 500,
    code: 'internal_error',
    message: 'Algo salió mal. Probá de nuevo.',
  };
}

export function logError(error: unknown): void {
  if (error instanceof AppError) {
    console.error(`[cope] ${error.code} (${error.status})`);
    return;
  }
  if (isAbortError(error)) return;
  const name = error instanceof Error ? error.name : 'UnknownError';
  console.error(`[cope] ${name}`);
}
