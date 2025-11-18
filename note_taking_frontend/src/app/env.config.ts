export interface AppEnv {
  apiBase?: string | null;
  backendUrl?: string | null;
  wsUrl?: string | null;
  featureFlags?: Record<string, unknown> | null;
  nodeEnv?: string | null;
}

const getVar = (key: string): string | null => {
  try {
    // Angular build-time substitution supports import.meta.env, process.env is often undefined in browser.
    const v = (import.meta as any)?.env?.[key] ?? (globalThis as any)?.process?.env?.[key] ?? null;
    return typeof v === 'string' ? v : (v ? String(v) : null);
  } catch {
    return null;
  }
};

// PUBLIC_INTERFACE
export function getAppEnv(): AppEnv {
  return {
    apiBase: getVar('NG_APP_API_BASE') || getVar('NG_APP_BACKEND_URL') || null,
    backendUrl: getVar('NG_APP_BACKEND_URL') || getVar('NG_APP_API_BASE') || null,
    wsUrl: getVar('NG_APP_WS_URL') || null,
    featureFlags: (() => {
      const raw = getVar('NG_APP_FEATURE_FLAGS');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    })(),
    nodeEnv: getVar('NG_APP_NODE_ENV') || null,
  };
}
