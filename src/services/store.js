// Tiny localStorage-backed reactive store (works with useSyncExternalStore).
import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "resqflow.v2.";
const MEMORY_ONLY = new Set(["users"]); // never written to browser storage
const cache = new Map();
const listeners = new Map();

export function read(key, fallback) {
  if (cache.has(key)) return cache.get(key);
  let value = fallback;
  try {
    const raw = MEMORY_ONLY.has(key) ? null : localStorage.getItem(PREFIX + key);
    if (raw !== null) value = JSON.parse(raw);
  } catch { /* ignore */ }
  cache.set(key, value);
  return value;
}

export function write(key, value) {
  cache.set(key, value);
  try { if (!MEMORY_ONLY.has(key)) localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage full / blocked */ }
  (listeners.get(key) || new Set()).forEach((l) => l());
}

export function update(key, fallback, fn) {
  write(key, fn(read(key, fallback)));
}

export function clearAll() {
  Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  cache.clear();
  listeners.forEach((set) => set.forEach((l) => l()));
}

export function useStore(key, fallback) {
  const subscribe = useCallback((cb) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(cb);
    return () => listeners.get(key).delete(cb);
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => read(key, fallback));
  const set = useCallback((v) => write(key, typeof v === "function" ? v(read(key, fallback)) : v), [key, fallback]);
  return [value, set];
}
