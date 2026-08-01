"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CAPABILITY_STORAGE_KEY,
  DEFAULT_CAPABILITY_MODE,
  parseCapabilityMode,
  videoEnabled,
  type CapabilityMode,
} from "@/lib/capability";

type CapabilityContextValue = {
  mode: CapabilityMode;
  setMode: (mode: CapabilityMode) => void;
  videoOn: boolean;
  ready: boolean;
};

const CapabilityContext = createContext<CapabilityContextValue | null>(null);

export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<CapabilityMode>(DEFAULT_CAPABILITY_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CAPABILITY_STORAGE_KEY);
      if (raw) setModeState(parseCapabilityMode(raw));
    } catch {
      /* private mode / SSR */
    }
    setReady(true);
  }, []);

  const setMode = useCallback((next: CapabilityMode) => {
    setModeState(next);
    try {
      localStorage.setItem(CAPABILITY_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      videoOn: videoEnabled(mode),
      ready,
    }),
    [mode, setMode, ready],
  );

  return (
    <CapabilityContext.Provider value={value}>{children}</CapabilityContext.Provider>
  );
}

export function useCapability() {
  const ctx = useContext(CapabilityContext);
  if (!ctx) {
    throw new Error("useCapability must be used within CapabilityProvider");
  }
  return ctx;
}

/** Soft hook for optional use outside provider (returns defaults). */
export function useCapabilityOptional(): CapabilityContextValue {
  const ctx = useContext(CapabilityContext);
  return (
    ctx ?? {
      mode: DEFAULT_CAPABILITY_MODE,
      setMode: () => {},
      videoOn: true,
      ready: true,
    }
  );
}
