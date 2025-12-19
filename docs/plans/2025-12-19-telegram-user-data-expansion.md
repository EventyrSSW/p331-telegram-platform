# Telegram User Data Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Store all available Telegram user data (language_code, photo_url, is_premium) in the database during authentication.

**Architecture:** Expand the User model with new optional fields, update the TelegramUser interface to include all Telegram WebApp fields, modify authService to upsert all fields, and update frontend types to expose the new data.

**Tech Stack:** Prisma, PostgreSQL, TypeScript, React Context

---

## Task 1: Add new fields to User model

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Update User model with new Telegram fields**

Add after `lastName` field (line 18):

```prisma
model User {
  id              String    @id @default(cuid())
  telegramId      BigInt    @unique
  username        String?
  firstName       String?
  lastName        String?
  languageCode    String?   // Telegram language code (e.g., "en", "ru")
  photoUrl        String?   // Telegram profile photo URL
  isPremium       Boolean   @default(false) // Telegram Premium status
  walletAddress   String?   @unique
  coinBalance     Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  transactions    Transaction[]
  gameSessions    GameSession[]

  @@index([telegramId])
  @@index([walletAddress])
}
```

**Step 2: Create migration**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx prisma migrate dev --name add_telegram_user_fields`

Expected: Migration created successfully

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add languageCode, photoUrl, isPremium to User model"
```

---

## Task 2: Update TelegramUser interface in telegram.ts

**Files:**
- Modify: `server/src/utils/telegram.ts`

**Step 1: Expand TelegramUser interface**

Replace the existing interface (lines 3-9):

```typescript
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  added_to_attachment_menu?: boolean;
}
```

**Step 2: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/telegram.ts
git commit -m "feat: expand TelegramUser interface with all available fields"
```

---

## Task 3: Update authService to save all Telegram fields

**Files:**
- Modify: `server/src/services/authService.ts`

**Step 1: Update TelegramUser interface in authService**

Replace the interface (lines 5-12):

```typescript
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}
```

**Step 2: Update upsert in authenticateFromTelegram**

Replace the upsert (lines 25-38):

```typescript
const user = await prisma.user.upsert({
  where: { telegramId: BigInt(telegramUser.id) },
  update: {
    username: telegramUser.username,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name,
    languageCode: telegramUser.language_code,
    photoUrl: telegramUser.photo_url,
    isPremium: telegramUser.is_premium ?? false,
  },
  create: {
    telegramId: BigInt(telegramUser.id),
    username: telegramUser.username,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name,
    languageCode: telegramUser.language_code,
    photoUrl: telegramUser.photo_url,
    isPremium: telegramUser.is_premium ?? false,
  },
});
```

**Step 3: Update return object to include new fields**

Replace the return user object (lines 46-57):

```typescript
return {
  token,
  user: {
    id: user.id,
    telegramId: Number(user.telegramId),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    languageCode: user.languageCode,
    photoUrl: user.photoUrl,
    isPremium: user.isPremium,
    coinBalance: user.coinBalance,
    walletAddress: user.walletAddress,
  },
};
```

**Step 4: Update getUserById return object**

Replace the return in getUserById (lines 111-119):

```typescript
return {
  id: user.id,
  telegramId: Number(user.telegramId),
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  languageCode: user.languageCode,
  photoUrl: user.photoUrl,
  isPremium: user.isPremium,
  coinBalance: user.coinBalance,
  walletAddress: user.walletAddress,
};
```

**Step 5: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npx tsc --noEmit`

Expected: No errors

**Step 6: Commit**

```bash
git add src/services/authService.ts
git commit -m "feat: save all Telegram user fields to database"
```

---

## Task 4: Update frontend User type

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Update User interface**

Find and update the User interface:

```typescript
export interface User {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  photoUrl: string | null;
  isPremium: boolean;
  coinBalance: number;
  walletAddress: string | null;
}
```

**Step 2: Verify compilation**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add new Telegram fields to frontend User type"
```

---

## Task 5: Build and test

**Step 1: Build server**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform/server && npm run build`

Expected: Build succeeds

**Step 2: Build frontend**

Run: `cd /Users/olegvoytenko/Development/p331-telegram-platform && npm run build`

Expected: Build succeeds

**Step 3: Push all changes**

```bash
git push origin main
```

---

## Task 6: Deploy and run migration

**On Hetzner server:**

```bash
cd /opt/p331-telegram-platform
bash deploy.sh
```

The deploy.sh will run `npx prisma migrate deploy` automatically.

**Step 2: Test in Telegram**

Open Mini App in Telegram and check:
1. Network tab shows `/api/auth/telegram` response includes new fields
2. If user has profile photo, `photoUrl` should be populated
3. If user has Premium, `isPremium` should be `true`

---

## Summary

After implementation:
- User model has: `languageCode`, `photoUrl`, `isPremium`
- Auth saves all available Telegram data on each login
- Frontend has access to user's photo URL for avatars
- Premium status can be used for special features
