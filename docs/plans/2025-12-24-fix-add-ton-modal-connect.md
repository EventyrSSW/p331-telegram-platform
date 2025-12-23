# Fix AddTonModal Connect Wallet Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the "Connect Wallet" button in AddTonModal so clicking it opens the TonConnect modal properly.

**Architecture:** The bug occurs because the AddTonModal (z-index 1000) stays open when TonConnect modal opens, blocking user interaction. The fix is to close the AddTonModal before opening TonConnect, similar to how other wallet connection flows work.

**Tech Stack:** React, TonConnect UI React

---

### Task 1: Fix the Connect Wallet flow in AddTonModal

**Files:**
- Modify: `src/components/AddTonModal/AddTonModal.tsx`

**Step 1: Update handleAction to close modal before connecting**

In the `handleAction` function, when wallet is not connected, close the modal first before calling `onConnectWallet`:

Change lines 65-72 from:
```typescript
const handleAction = async () => {
  if (isProcessing) return;

  if (!isWalletConnected) {
    haptic.medium();
    onConnectWallet();
    return;
  }
```

To:
```typescript
const handleAction = async () => {
  if (isProcessing) return;

  if (!isWalletConnected) {
    haptic.medium();
    onClose(); // Close modal first so TonConnect modal is visible
    onConnectWallet();
    return;
  }
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/components/AddTonModal/AddTonModal.tsx
git commit -m "fix(add-ton-modal): close modal before opening TonConnect"
```

---

### Task 2: Test the fix

**Step 1: Manual testing**

1. Open the app
2. Click TON icon in header to open AddTonModal
3. Ensure wallet is NOT connected
4. Click "Connect Wallet" button
5. Verify: AddTonModal closes AND TonConnect modal opens
6. Connect wallet in TonConnect modal
7. Click TON icon again
8. Verify: Modal shows "Add TON" button (wallet is now connected)

**Step 2: Push changes**

```bash
git push
```
