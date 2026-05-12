'use client';

import { useEffect } from 'react';
import { Action } from '../engine/reducer';
import { GamePhase } from '../engine/types';

type Dispatch = (action: Action) => void;

export function useInput(dispatch: Dispatch, phase: GamePhase) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          dispatch({ type: 'MOVE_LEFT' });
          break;
        case 'ArrowRight':
          e.preventDefault();
          dispatch({ type: 'MOVE_RIGHT' });
          break;
        case 'ArrowDown':
          e.preventDefault();
          dispatch({ type: 'SOFT_DROP' });
          break;
        case 'KeyZ':
          dispatch({ type: 'ROTATE_CCW' });
          break;
        case 'KeyX':
          dispatch({ type: 'ROTATE_CW' });
          break;
        case 'KeyP':
        case 'Escape':
          if (phase === 'playing' || phase === 'locking') {
            dispatch({ type: 'PAUSE' });
          } else if (phase === 'paused') {
            dispatch({ type: 'RESUME' });
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, phase]);
}
