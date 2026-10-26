let updateApplication: ((reloadPage?: boolean) => Promise<void>) | null = null;

export interface PwaCallbacks {
  onNeedRefresh: () => void;
  onOfflineReady: () => void;
}

export function setupPwa(callbacks: PwaCallbacks): void {
  if (import.meta.env.DEV) return;
  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      updateApplication = registerSW({
        immediate: true,
        onNeedRefresh: callbacks.onNeedRefresh,
        onOfflineReady: callbacks.onOfflineReady,
      });
    })
    .catch(() => {
      // La app sigue funcionando aunque el service worker no se registre.
    });
}

export function applyPwaUpdate(): void {
  void updateApplication?.(true);
}
