import type { ServerConfig } from '../config';

export interface HealthPayload {
  ok: true;
  demo: boolean;
  configured: boolean;
}

export function healthPayload(config: ServerConfig): HealthPayload {
  return {
    ok: true,
    demo: config.demo,
    configured: !config.demo,
  };
}
