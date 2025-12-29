# Welcome Bonus Banner Redesign

**Date:** 2025-12-29
**Status:** Ready for Implementation

## Overview

Redesign the Welcome Bonus banner to match the new visual design with full-width layout and 2X bonus image.

## Design Specifications

### Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│  Welcome Bonus              ┌──────────┐                │
│  Double Your Deposit        │   2X     │                │
│  [DEPOSIT NOW]              │  image   │                │
│                             └──────────┘                │
│                             ⏰ 2h 56m left              │
└─────────────────────────────────────────────────────────┘
```

### Components

**Left Section:**
- "Welcome Bonus" label
  - Color: #6ECCFF (light blue)
  - Font size: 12px
  - Font weight: 400

- "Double Your Deposit" title
  - Color: white
  - Font size: 24px
  - Font weight: 700

- "DEPOSIT NOW" button
  - Background: rgba(255, 255, 255, 0.2)
  - Color: white
  - Font size: 16px
  - Font weight: 700
  - Border radius: 50px
  - Padding: 10px 20px

**Right Section:**
- 2X Bonus Image
  - File: `src/assets/images/d321f4534ce7a69afd6e3121648f26052532820d.png`
  - Border: 2-3px solid rgba(110, 204, 255, 0.6)
  - Border radius: 12px
  - Size: ~120px × 100px

- Timer
  - Clock icon + text
  - Color: white
  - Font size: 12px
  - Position: below image, centered

### Banner Container

- **Width:** 100% (minus container padding)
- **Background:** Linear gradient
  - Color 1: #3B5F7D (dark blue)
  - Color 2: #2B4A5F (darker blue)
  - Direction: 90deg or similar
- **Padding:** 16-20px
- **Border radius:** 20px
- **Layout:** Flexbox, horizontal, space-between

## Technical Changes

### Files to Modify

1. `src/components/WelcomeBonusBanner/WelcomeBonusBanner.tsx`
   - Update JSX structure to match new layout
   - Replace text "2X" with image element
   - Import 2X image

2. `src/components/WelcomeBonusBanner/WelcomeBonusBanner.module.css`
   - Remove fixed width (362px)
   - Update to 100% width
   - Adjust gradient colors to match design
   - Add border styling for 2X image
   - Reposition timer below image
   - Adjust padding and spacing

3. `src/pages/HomePage/HomePage.module.css`
   - Update `.bonusSection` to allow full width
   - Remove center alignment if needed

## Implementation Notes

- Keep existing props (`variant`, `onDepositClick`)
- Maintain timer countdown functionality
- Ensure responsive behavior on mobile
- Keep haptic feedback on button click
- Image should maintain aspect ratio

## Success Criteria

- [ ] Banner stretches full width (minus page padding)
- [ ] 2X image displays with border and proper sizing
- [ ] Timer appears below image
- [ ] Layout matches provided screenshot exactly
- [ ] Button interaction works (haptic + callback)
- [ ] Responsive on mobile devices
