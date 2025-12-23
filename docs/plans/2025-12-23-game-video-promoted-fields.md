# Game Video URL and Top Promoted Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `videoUrl` and `topPromoted` fields to Game model and return them to the frontend home page.

**Architecture:** Update Prisma schema with new fields, run migration, update seed data with values for existing games, update frontend TypeScript interface to include new fields.

**Tech Stack:** Prisma ORM, PostgreSQL, TypeScript, React

---

### Task 1: Update Prisma Schema with New Game Fields

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add videoUrl and topPromoted fields to Game model**

In `server/prisma/schema.prisma`, add after `reviewCount` field:

```prisma
model Game {
  id              String    @id @default(cuid())
  slug            String    @unique
  title           String
  description     String
  thumbnail       String
  category        String
  featured        Boolean   @default(false)
  active          Boolean   @default(true)
  mainUrl         String?
  screen1Url      String?
  screen2Url      String?
  screen3Url      String?
  screen4Url      String?
  rating          Float?
  reviewCount     Int?
  videoUrl        String?
  topPromoted     Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  sessions        GameSession[]
}
```

**Step 2: Verify schema is valid**

Run: `cd server && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(schema): add videoUrl and topPromoted fields to Game model"
```

---

### Task 2: Run Prisma Migration

**Step 1: Generate and run migration**

Run: `cd server && npx prisma migrate dev --name add_game_video_promoted`
Expected: Migration created and applied successfully

**Step 2: Verify migration file exists**

Check that `server/prisma/migrations/*_add_game_video_promoted/migration.sql` was created with:
```sql
ALTER TABLE "Game" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Game" ADD COLUMN "topPromoted" BOOLEAN NOT NULL DEFAULT false;
```

**Step 3: Commit migration**

```bash
git add server/prisma/migrations
git commit -m "chore(db): add migration for videoUrl and topPromoted fields"
```

---

### Task 3: Update Seed Data with New Fields

**Files:**
- Modify: `server/prisma/seed.ts`

**Step 1: Update games array with videoUrl and topPromoted**

Add `videoUrl` and `topPromoted` to each game object. Set `topPromoted: true` for featured games (mahjong-dash, puzzle-master). Use placeholder video URLs or null:

```typescript
const games = [
  {
    slug: 'mahjong-dash',
    // ... existing fields ...
    videoUrl: null,
    topPromoted: true,
  },
  {
    slug: 'puzzle-master',
    // ... existing fields ...
    videoUrl: null,
    topPromoted: true,
  },
  {
    slug: 'bubble-shooter-arena',
    // ... existing fields ...
    videoUrl: null,
    topPromoted: false,
  },
  // ... rest of games with topPromoted: false
]
```

**Step 2: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat(seed): add videoUrl and topPromoted to game data"
```

---

### Task 4: Run Database Seed

**Step 1: Run seed script**

Run: `cd server && npm run prisma:seed`
Expected: Games seeded successfully with new fields

**Step 2: Verify data in database**

Run: `cd server && npx prisma studio`
Check Game table shows videoUrl and topPromoted columns with correct values

---

### Task 5: Update Frontend Game Interface

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add videoUrl and topPromoted to Game interface**

```typescript
export interface Game {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  category: string;
  description?: string;
  featured?: boolean;
  mainUrl?: string;
  screen1Url?: string;
  screen2Url?: string;
  screen3Url?: string;
  screen4Url?: string;
  rating?: number;
  reviewCount?: number;
  videoUrl?: string;
  topPromoted?: boolean;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat(api): add videoUrl and topPromoted to Game interface"
```

---

### Task 6: Verify API Returns New Fields

**Step 1: Start the server**

Run: `cd server && npm run dev`

**Step 2: Test API endpoint**

Run: `curl http://localhost:3001/api/games | jq '.[0] | {slug, videoUrl, topPromoted}'`
Expected: Returns game with videoUrl and topPromoted fields

**Step 3: Verify frontend build**

Run: `npm run build`
Expected: Build succeeds

---

## Summary

This implementation:

1. **Prisma Schema** - Adds `videoUrl String?` and `topPromoted Boolean @default(false)` to Game model
2. **Migration** - Creates database migration for new columns
3. **Seed Data** - Updates all 11 games with videoUrl (null) and topPromoted (true for mahjong-dash, puzzle-master)
4. **Frontend Interface** - Adds videoUrl and topPromoted to Game TypeScript interface

**Result:** Home page will receive games with videoUrl and topPromoted fields from API, ready for UI display.
