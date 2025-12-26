# Mock User Stats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace database-backed user stats with mocked data in preparation for integration with external game service

**Architecture:** Remove Prisma queries from backend stats endpoint and replace with mock data. Frontend will continue using the same API endpoint, but backend will return static mock data instead of database queries.

**Tech Stack:** Node.js, Express, TypeScript (backend); React, TypeScript (frontend - no changes needed)

**Reason:** Stats will eventually come from external game service, not our database. Mock data allows UI development to continue while external service integration is pending.

---

## Task 1: Remove Database Stats Implementation from Backend

**Files:**
- Modify: `server/src/services/userService.ts`

**Step 1: Read current implementation**

Run: `cat server/src/services/userService.ts`

Review lines 161-184 to see current `getUserGameStats` method.

**Step 2: Replace with mock implementation**

Replace the `getUserGameStats` method (lines 165-184) with mock data:

```typescript
/**
 * Get user's game statistics
 * TEMPORARY: Returns mock data until external game service integration
 * TODO: Replace with actual game service API calls
 */
async getUserGameStats(userId: string) {
  // Mock data for UI development
  // This will be replaced with external game service API
  return {
    gamesPlayed: 42,
    totalWins: 18,
    amountWon: 1250,
  };
}
```

**Step 3: Verify controller still works**

Read `server/src/controllers/usersController.ts` lines 148-165 to confirm:
- Controller calls `userService.getUserGameStats(user.id)`
- Returns the stats object directly via `res.json(stats)`
- No changes needed to controller

**Step 4: Test the endpoint**

Run: `curl http://localhost:3001/api/users/me/stats -H "Authorization: Bearer <token>"`

Expected response:
```json
{
  "gamesPlayed": 42,
  "totalWins": 18,
  "amountWon": 1250
}
```

**Step 5: Commit changes**

```bash
git add server/src/services/userService.ts
git commit -m "feat: replace database stats with mock data

- Remove Prisma aggregation queries from getUserGameStats
- Return static mock data for UI development
- Preparation for external game service integration
- TODO: Replace with actual game service API calls"
```

---

## Task 2: Verify Frontend Still Works

**Files:**
- No changes needed (verification only)

**Step 1: Verify frontend API call**

Read `src/services/api.ts` lines 155-157:

```typescript
async getUserStats(): Promise<UserStats> {
  return this.fetch<UserStats>('/users/me/stats');
}
```

Confirm: No changes needed - endpoint remains the same.

**Step 2: Verify ProfilePage integration**

Read `src/pages/ProfilePage/ProfilePage.tsx` lines 23-34:

```typescript
const loadStats = async () => {
  try {
    setLoading(true);
    const userStats = await api.getUserStats();
    setStats(userStats);
  } catch (err) {
    console.error('Failed to load stats:', err);
    setError('Failed to load statistics');
  } finally {
    setLoading(false);
  }
};
```

Confirm: No changes needed - component uses same API method.

**Step 3: Manual verification checklist**

If server is running:
1. Navigate to `/profile`
2. Verify stats cards display:
   - Games Played: 42
   - Total Wins: 18
   - Amount Won: $1250
3. Verify no console errors
4. Verify loading states work correctly

---

## Task 3: Add Documentation for Future Integration

**Files:**
- Modify: `server/src/services/userService.ts`

**Step 1: Add comprehensive TODO comment**

Add above the `getUserGameStats` method:

```typescript
/**
 * Get user's game statistics
 *
 * TEMPORARY IMPLEMENTATION - MOCK DATA
 *
 * Current Status:
 * - Returns static mock data for UI development
 * - Database queries removed (no longer using GameSession table)
 *
 * Future Implementation:
 * - Integrate with external game service API
 * - Add service configuration (API endpoint, auth)
 * - Add error handling for external service failures
 * - Add caching layer for performance
 * - Consider fallback to default values if service unavailable
 *
 * Expected External API Contract:
 * GET /api/v1/users/{userId}/stats
 * Response: { gamesPlayed: number, totalWins: number, amountWon: number }
 *
 * @param userId - Internal user ID (may need to be mapped to external service ID)
 * @returns Promise<{ gamesPlayed: number, totalWins: number, amountWon: number }>
 */
async getUserGameStats(userId: string) {
  // TODO: Replace with external game service API call
  // Example:
  // const response = await fetch(`${GAME_SERVICE_URL}/users/${userId}/stats`);
  // return response.json();

  return {
    gamesPlayed: 42,
    totalWins: 18,
    amountWon: 1250,
  };
}
```

**Step 2: Commit documentation**

```bash
git add server/src/services/userService.ts
git commit -m "docs: add TODO comments for game service integration

- Document current mock implementation status
- Outline future integration requirements
- Specify expected external API contract
- Note considerations for error handling and caching"
```

---

## Task 4: Optional - Add Environment-Based Mock Variation

**Files:**
- Modify: `server/src/services/userService.ts`

**Step 1: Add slight variation to mock data**

This makes it more obvious that data is mocked during development:

```typescript
async getUserGameStats(userId: string) {
  // TODO: Replace with external game service API call

  // Mock data with slight user-based variation
  // This makes it easier to spot that mock data is being used
  const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = userHash % 10;

  return {
    gamesPlayed: 40 + variation,
    totalWins: 15 + Math.floor(variation / 2),
    amountWon: 1200 + (variation * 50),
  };
}
```

**Step 2: Commit optional enhancement**

```bash
git add server/src/services/userService.ts
git commit -m "feat: add user-based variation to mock stats

- Generate slightly different stats per user
- Makes mock data more obvious during development
- Still deterministic for testing"
```

---

## Summary

This plan removes the database-backed stats implementation and replaces it with mock data:

**Changes Made:**
- ✓ Removed Prisma queries from `getUserGameStats`
- ✓ Replaced with static mock data
- ✓ Added comprehensive documentation for future integration
- ✓ Frontend requires no changes (same API contract)

**Why Mock Data:**
- Stats will come from external game service (not our DB)
- Allows UI development to continue independently
- Simplifies backend until external service is ready
- Frontend code remains unchanged

**Future Work:**
- Integrate with external game service API
- Add error handling and caching
- Map user IDs if needed
- Handle service unavailability gracefully

**Files Modified:**
- Backend: 1 file (`server/src/services/userService.ts`)
- Frontend: 0 files (no changes needed)

**Total Estimated Time:** 15-20 minutes
