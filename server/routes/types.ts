export interface RequestContext {
  ip: string;
  origin: string | null;
  host: string | null;
  ownerCode?: string | null;
  signal?: AbortSignal;
}

export interface RouteFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}
