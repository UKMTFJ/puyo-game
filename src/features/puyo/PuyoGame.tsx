'use client';

import { useGame } from './hooks/useGame';
import { useInput } from './hooks/useInput';
import { FieldView } from './components/FieldView';
import { NextPuyoPanel } from './components/NextPuyoPanel';
import { ScorePanel } from './components/ScorePanel';
import { TitleScreen } from './components/TitleScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { PauseOverlay } from './components/PauseOverlay';

export function PuyoGame() {
  const { state, dispatch, startGame, resume, returnToTitle } = useGame();
  useInput(dispatch, state.phase);

  if (state.phase === 'title') {
    return <TitleScreen onStart={startGame} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px 16px',
        gap: 20,
      }}
      tabIndex={-1}
    >
      {/* Field + overlays */}
      <div style={{ position: 'relative' }}>
        <FieldView
          field={state.field}
          currentPair={state.currentPair}
          clearingCells={state.clearingCells}
        />
        {state.phase === 'paused' && (
          <PauseOverlay onResume={resume} onTitle={returnToTitle} />
        )}
        {state.phase === 'gameover' && (
          <GameOverScreen
            score={state.score}
            onRetry={() => startGame(state.difficulty)}
            onTitle={returnToTitle}
          />
        )}
      </div>

      {/* Side panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingTop: 4,
        }}
      >
        <NextPuyoPanel nextPairs={state.nextPairs} />
        <ScorePanel
          score={state.score}
          chain={state.chain}
          ojamaPending={state.ojamaPending}
        />
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 11,
            color: '#475569',
            lineHeight: 2,
          }}
        >
          <div>← → 移動</div>
          <div>↓ 落下</div>
          <div>Z 反時計 / X 時計</div>
          <div>P / Esc ポーズ</div>
        </div>
      </div>
    </div>
  );
}
