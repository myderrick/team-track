// src/hooks/useSearchParamsState.js
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function useSearchParamsState(state, setters) {
  const [params, setParams] = useSearchParams();

  // Load once on mount
  useEffect(() => {
    Object.entries(setters).forEach(([key, set]) => {
      const v = params.get(key);
      if (v !== null) set(v);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write back on change
  useEffect(() => {
    const next = new URLSearchParams(params);
    Object.entries(state).forEach(([key, val]) => {
      if (val === '' || val == null) next.delete(key);
      else next.set(key, String(val));
    });
    setParams(next, { replace: true });
  }, [state, params, setParams]);
}
