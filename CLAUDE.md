# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server with Turbopack on http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run lint:fix # Auto-fix ESLint issues
```

## Architecture

**Framework**: Next.js 16 App Router with TypeScript (strict mode), React 19.

**Directory layout**:
- `src/app/` — App Router root. `layout.tsx` is the root layout; `page.tsx` is the home route.
- `src/app/globals.css` — Global styles and CSS custom properties (design tokens). All styling uses Vanilla CSS — no CSS framework.
- Path alias `@/*` resolves to `src/*`.

**Styling conventions**: CSS variables are defined in `:root` in `globals.css`. Reusable utility classes (`.glass`, `.btn-primary`, `.gradient-text`, `.glow`) are defined there. New components should use these tokens rather than hard-coded values.

**Bundler**: Turbopack is the default (`next dev` uses it automatically). To force Webpack: `next dev --webpack`.

**ESLint**: Uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` via flat config (`eslint.config.mjs`). `next build` does **not** run linting automatically (changed in Next.js 16).

---

## ぷよぷよ 要件定義

### 概要

Next.js 16 App Router + TypeScript + React 19 上でブラウザ動作するぷよぷよの実装。

---

### ゲーム仕様

#### フィールド
- 横 6 列 × 縦 13 行（うち最上行はスポーン専用の見えない行）
- セルサイズは CSS 変数で管理し、レスポンシブ対応

#### ぷよの種類
- 色ぷよ: 赤・緑・青・黄・紫 の 5 色
- おじゃまぷよ: 1 セル占有、色消しには参加しないが隣接消しに巻き込まれて消える

#### 操作ぷよ（ツモ）
- 2 個 1 組（軸ぷよ＋副ぷよ）でスポーン
- 操作: 左右移動 / 下加速（ソフトドロップ） / 時計回り・反時計回り回転
- スポーン位置: 列 3（0-indexed）の最上段

#### 物理
- 重力: 一定間隔で 1 行ずつ落下（難易度に応じて間隔短縮）
- 接地: 最下行またはスタック上端に触れた時点でロック（ロック猶予あり）
- 浮いたぷよは接地まで落下（連鎖後も同様）

#### 消去ルール
- 同色 4 個以上が上下左右に連結されたグループを消去
- 消去後に浮いたぷよが落下 → 再チェック → 連鎖（れんさ）

#### 連鎖・スコア
| 連鎖数 | 連鎖ボーナス倍率 |
|--------|----------------|
| 1      | 0              |
| 2      | 8              |
| 3      | 16             |
| 4      | 32             |
| N≥5    | 64 × 2^(N-5)   |

スコア = (消去ぷよ数 × 10) × (連鎖ボーナス + 色ボーナス + グループボーナス)

#### おじゃまぷよ生成（対戦 / シングルAI）
- 相手に送る量 = 連鎖数に応じたおじゃま換算値
- おじゃまは次のツモ落下前にフィールド最上行へ降ってくる

#### ゲームオーバー
- スポーン位置（列 3 の最上段）がスタックで塞がれた場合

---

### 画面・UI

| 画面 | 内容 |
|------|------|
| タイトル | ゲーム開始 / 難易度選択 |
| ゲームプレイ | フィールド・次ぷよ表示・スコア・レベル・おじゃまカウンター |
| ポーズ | 再開 / タイトルへ |
| ゲームオーバー | スコア表示・リトライ / タイトルへ |

- NEXT ぷよ: 2 組先まで表示
- キーボード操作表示（オーバーレイ）

---

### 操作（キーバインド）

| キー | アクション |
|------|-----------|
| ←    | 左移動 |
| →    | 右移動 |
| ↓    | ソフトドロップ |
| Z    | 反時計回り回転 |
| X    | 時計回り回転 |
| P / Esc | ポーズ |

---

### 難易度

| レベル | 落下間隔 | 説明 |
|--------|---------|------|
| Easy   | 800 ms  | 初心者向け |
| Normal | 500 ms  | 標準 |
| Hard   | 300 ms  | 上級者向け |

---

### 技術設計方針

- **状態管理**: React `useReducer` でゲームステートを一元管理
- **ループ**: `requestAnimationFrame` ベースのゲームループ（`useEffect` 内）
- **レンダリング**: DOM（CSS Grid）または `<canvas>` — 実装時に選択
- **型安全**: フィールドは `readonly` な 2D 配列型で表現
- **ランダム**: ぷよ色の抽選に `Math.random`（シード不要）
- **サウンド**: `Web Audio API` による効果音（任意実装）
- **ファイル配置**:
  - `src/app/puyo/page.tsx` — ゲームページルート
  - `src/features/puyo/` — ゲームロジック・コンポーネント群
  - `src/features/puyo/engine/` — 純粋関数によるゲームエンジン（フィールド操作・消去・スコア）
  - `src/features/puyo/hooks/` — `useGame`, `useInput` など

---

### 非機能要件

- ターゲットブラウザ: Chrome / Firefox / Safari 最新版
- 60 fps を目標（重い処理はメインスレッドから分離を検討）
- アクセシビリティ: ゲーム画面にはキーボードフォーカスを固定、`aria-live` でスコア更新を通知
