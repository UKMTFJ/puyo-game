'use client';

import { useReducer, useEffect, useRef, useCallback } from 'react';
import { gameReducer, initialState } from '../engine/reducer';
import { Difficulty } from '../engine/types';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;

  useEffect(() => {
    let active = true;

    const tick = (timestamp: number) => {
      if (!active) return;
      const phase = phaseRef.current;
      if (phase === 'playing' || phase === 'locking' || phase === 'clearing') {
        dispatch({ type: 'TICK', timestamp: Date.now() });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startGame = useCallback(
    (difficulty: Difficulty) => dispatch({ type: 'START_GAME', difficulty }),
    [],
  );
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const returnToTitle = useCallback(() => dispatch({ type: 'RETURN_TO_TITLE' }), []);

  return { state, dispatch, startGame, pause, resume, returnToTitle };
}
