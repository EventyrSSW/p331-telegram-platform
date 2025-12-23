# Mahjong Dash Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install the new Mahjong Dash game as a second playable game (mapped to existing "puzzle-master" slug) and integrate level selection and completion callbacks.

**Architecture:** Copy game files to public/games folder, map existing "puzzle-master" game slug to the new Unity build, update UnityGame component to support level data passing and completion callbacks via window functions.

**Tech Stack:** React, TypeScript, Unity WebGL, window global APIs

---

### Task 1: Copy Game Files to Public Folder

**Files:**
- Create: `public/games/mahjong-dash/` (copy from `mahjong-dash/`)

**Step 1: Copy the mahjong-dash game folder to public/games**

```bash
cp -r mahjong-dash public/games/mahjong-dash
```

**Step 2: Verify the files are copied correctly**

Run: `ls -la public/games/mahjong-dash/Build/`
Expected: Files `mahjong-dash.data`, `mahjong-dash.framework.js`, `mahjong-dash.loader.js`, `mahjong-dash.wasm`

**Step 3: Commit**

```bash
git add public/games/mahjong-dash
git commit -m "feat: add mahjong-dash Unity WebGL build files"
```

---

### Task 2: Add Game Slug Mapping for Existing Game

**Files:**
- Modify: `src/pages/GamePage/GamePage.tsx:5-7`

**Step 1: Add puzzle-master to GAME_SLUGS mapping**

Update the GAME_SLUGS constant to map `puzzle-master` (already in database) to the new Unity build:

```typescript
const GAME_SLUGS: Record<string, string> = {
  'mahjong-dash': 'mahjong3',
  'puzzle-master': 'mahjong-dash',
};
```

**Step 2: Verify the mapping is correct**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/pages/GamePage/GamePage.tsx
git commit -m "feat: map puzzle-master to mahjong-dash Unity build"
```

---

### Task 3: Update UnityGame to Support Level Data and Callbacks

**Files:**
- Modify: `src/components/UnityGame/UnityGame.tsx`

**Step 1: Add new props for level data and completion callback**

Update interface and component:

```typescript
interface LevelCompleteData {
  level: number;
  score: number;
  coins: number;
}

interface UnityGameProps {
  gameSlug: string;
  levelData?: number;
  onLevelComplete?: (data: LevelCompleteData) => void;
  onBack?: () => void;
}
```

**Step 2: Add window functions setup after Unity instance loads**

After `setIsLoading(false)` (around line 95), add:

```typescript
// Store Unity instance globally for level control
(window as any).unityInstance = instance;

// Setup setLevelData function
(window as any).setLevelData = (levelDataString: string) => {
  if (instance) {
    console.log('Setting level data:', levelDataString);
    instance.SendMessage('WebGLBridge', 'SetLevelDataString', levelDataString);
    return true;
  }
  console.error('Unity instance not ready yet');
  return false;
};

// Setup level completion callback
(window as any).onLevelComplete = (data: LevelCompleteData) => {
  console.log('Level completed:', data);
  onLevelComplete?.(data);
};

// Setup levelComplete event listener
window.addEventListener('levelComplete', ((event: CustomEvent<LevelCompleteData>) => {
  console.log('Level complete event:', event.detail);
  onLevelComplete?.(event.detail);
}) as EventListener);

// If levelData prop provided, send it to Unity after short delay
if (levelData !== undefined) {
  setTimeout(() => {
    instance.SendMessage('WebGLBridge', 'ReceiveLevelData', levelData.toString());
  }, 1000);
}
```

**Step 3: Clean up event listener in useEffect cleanup**

Add to the cleanup function:

```typescript
// Remove level complete listener
window.removeEventListener('levelComplete', () => {});
(window as any).unityInstance = null;
(window as any).setLevelData = null;
(window as any).onLevelComplete = null;
```

**Step 4: Verify the build passes**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add src/components/UnityGame/UnityGame.tsx
git commit -m "feat: add level data and completion callback support to UnityGame"
```

---

### Task 4: Manual Testing

**Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts on localhost:5173

**Step 2: Navigate to the second game (puzzle-master)**

Open browser: `http://localhost:5173/game/puzzle-master`
Expected: Game loads with loading progress bar, then Unity game canvas appears

**Step 3: Test level selection via console**

Open browser console and run:
```javascript
window.setLevelData('5')
```
Expected: Console logs "Setting level data: 5" and game receives the data

**Step 4: Test level completion callback**

Play through a level or trigger completion in the game.
Expected: Console logs "Level completed:" with level, score, and coins data

---

### Task 5: Final Commit and Push

**Step 1: Check git status**

Run: `git status`
Expected: Shows all committed changes, working directory clean (or only unrelated files)

**Step 2: Push to remote**

```bash
git push
```

Expected: Changes pushed to origin/main
