import { useSyncExternalStore } from 'react';

const subscribe = (onTick: () => void) => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
};
// Whole seconds keep the snapshot stable within a render.
const getSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const getServerSnapshot = () => undefined;

/**
 * Current time, ticking every second on the client. Undefined during SSR and
 * hydration, so markup matches. Pass `frozen` to pin the clock (demos, tests).
 */
export function useNow(frozen?: number): number | undefined {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return frozen ?? now;
}
