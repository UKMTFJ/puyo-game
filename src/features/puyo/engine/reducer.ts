import {
  GameState,
  Difficulty,
  DROP_INTERVALS,
  LOCK_DELAY,
  CLEAR_DELAY,
  FIELD_COLS,
} from './types';
import {
  createEmptyField,
  createRandomPair,
  lockPair,
  applyGravity,
  findClearingCells,
  clearCells,
  isSpawnBlocked,
  tryMovePair,
  rotatePair as doRotate,
  canPlacePair,
} from './field';
import { calculateScore, ojamaSent } from './scoring';

export type Action =
  | { type: 'START_GAME'; difficulty: Difficulty }
  | { type: 'TICK'; timestamp: number }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'SOFT_DROP' }
  | { type: 'ROTATE_CW' }
  | { type: 'ROTATE_CCW' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RETURN_TO_TITLE' };

function makeInitialPlayingState(difficulty: Difficulty): GameState {
  const now = Date.now();
  return {
    field: createEmptyField(),
    currentPair: createRandomPair(),
    nextPairs: [createRandomPair(), createRandomPair()],
    score: 0,
    chain: 0,
    ojamaPending: 0,
    phase: 'playing',
    difficulty,
    clearingCells: new Set(),
    lastDropTime: now,
    lockStartTime: 0,
    clearStartTime: 0,
  };
}

function spawnNext(state: GameState, timestamp: number): GameState {
  const [next1, next2] = state.nextPairs;

  if (isSpawnBlocked(state.field)) {
    return { ...state, phase: 'gameover' };
  }

  return {
    ...state,
    currentPair: next1,
    nextPairs: [next2, createRandomPair()],
    chain: 0,
    phase: 'playing',
    lastDropTime: timestamp,
  };
}

function processClear(state: GameState, timestamp: number): GameState {
  const clearingCells = findClearingCells(state.field);
  if (clearingCells.size > 0) {
    return {
      ...state,
      phase: 'clearing',
      clearingCells,
      chain: state.chain + 1,
      clearStartTime: timestamp,
    };
  }
  return spawnNext(state, timestamp);
}

export const initialState: GameState = {
  field: createEmptyField(),
  currentPair: null,
  nextPairs: [createRandomPair(), createRandomPair()],
  score: 0,
  chain: 0,
  ojamaPending: 0,
  phase: 'title',
  difficulty: 'normal',
  clearingCells: new Set(),
  lastDropTime: 0,
  lockStartTime: 0,
  clearStartTime: 0,
};

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
      return makeInitialPlayingState(action.difficulty);

    case 'RETURN_TO_TITLE':
      return { ...initialState };

    case 'PAUSE':
      if (state.phase === 'playing' || state.phase === 'locking') {
        return { ...state, phase: 'paused' };
      }
      return state;

    case 'RESUME':
      if (state.phase === 'paused') {
        return { ...state, phase: 'playing', lastDropTime: Date.now() };
      }
      return state;

    case 'MOVE_LEFT':
    case 'MOVE_RIGHT': {
      if (!state.currentPair || (state.phase !== 'playing' && state.phase !== 'locking')) {
        return state;
      }
      const dc = action.type === 'MOVE_LEFT' ? -1 : 1;
      const moved = tryMovePair(state.field, state.currentPair, dc, 0);
      if (!moved) return state;

      const canFall = tryMovePair(state.field, moved, 0, 1) !== null;
      const now = Date.now();
      return {
        ...state,
        currentPair: moved,
        phase: canFall ? 'playing' : 'locking',
        lastDropTime: canFall ? now : state.lastDropTime,
        lockStartTime: canFall ? state.lockStartTime : now,
      };
    }

    case 'ROTATE_CW':
    case 'ROTATE_CCW': {
      if (!state.currentPair || (state.phase !== 'playing' && state.phase !== 'locking')) {
        return state;
      }
      const rotated = doRotate(state.field, state.currentPair, action.type === 'ROTATE_CW');
      if (rotated === state.currentPair) return state;
      return { ...state, currentPair: rotated };
    }

    case 'SOFT_DROP': {
      if (!state.currentPair || (state.phase !== 'playing' && state.phase !== 'locking')) {
        return state;
      }
      const moved = tryMovePair(state.field, state.currentPair, 0, 1);
      if (!moved) {
        if (state.phase === 'locking') return state;
        return { ...state, phase: 'locking', lockStartTime: Date.now() };
      }
      return { ...state, currentPair: moved, lastDropTime: Date.now(), phase: 'playing' };
    }

    case 'TICK': {
      const now = action.timestamp;
      const { phase } = state;

      if (phase === 'playing') {
        if (!state.currentPair) return state;
        const interval = DROP_INTERVALS[state.difficulty];
        if (now - state.lastDropTime < interval) return state;

        const moved = tryMovePair(state.field, state.currentPair, 0, 1);
        if (moved) {
          return { ...state, currentPair: moved, lastDropTime: now };
        }
        return { ...state, phase: 'locking', lockStartTime: now };
      }

      if (phase === 'locking') {
        if (!state.currentPair) return state;
        if (now - state.lockStartTime < LOCK_DELAY) return state;

        // Check if the piece is still grounded (might have been moved)
        const stillGrounded = tryMovePair(state.field, state.currentPair, 0, 1) === null;
        if (!stillGrounded) {
          return { ...state, phase: 'playing', lastDropTime: now };
        }

        const lockedField = lockPair(state.field, state.currentPair);
        const settledField = applyGravity(lockedField);
        return processClear({ ...state, field: settledField, currentPair: null }, now);
      }

      if (phase === 'clearing') {
        if (now - state.clearStartTime < CLEAR_DELAY) return state;

        const points = calculateScore(state.field, state.clearingCells, state.chain);
        const ojama = ojamaSent(state.chain);

        const clearedField = clearCells(state.field, state.clearingCells);
        const withGravity = applyGravity(clearedField);

        const newState = {
          ...state,
          field: withGravity,
          score: state.score + points,
          ojamaPending: state.ojamaPending + ojama,
          clearingCells: new Set<number>(),
        };

        return processClear(newState, now);
      }

      return state;
    }

    default:
      return state;
  }
}
