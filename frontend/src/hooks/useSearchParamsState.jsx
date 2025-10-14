// src/hooks/useSearchParamsState.js
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

function stringifyState(state) {
  // stable, sorted keys → stable string
  const entries = Object.entries(state)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => [k, String(v)]);
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return JSON.stringify(entries);
}

export default function useSearchParamsState(state, setters) {
  const [params, setParams] = useSearchParams();

  // 1) Load once on mount from URL -> state
  useEffect(() => {
    for (const [key, set] of Object.entries(setters)) {
      const v = params.get(key);
      if (v !== null) set(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // 2) Write state -> URL only if it would change the query string
  const stateKey = useMemo(() => stringifyState(state), [state]);

  useEffect(() => {
    // Build the "next" params from state
    const next = new URLSearchParams();
    for (const [key, val] of Object.entries(state)) {
      if (val === '' || val == null) continue;
      next.set(key, String(val));
    }

    const curStr = params.toString();
    const nextStr = next.toString();

    // Guard: only update if different → prevents loops
    if (curStr !== nextStr) {
      setParams(next, { replace: true });
    }
  }, [stateKey, params, setParams]);
}
