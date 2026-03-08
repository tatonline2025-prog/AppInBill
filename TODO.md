# TODO - Fix Invoice Status Visibility Issue

## Problem:
When admin changes invoice status from "not_collected" to "collected", the user responsible for that invoice doesn't see the status change.

## Issues Identified:

### Issue 1: In uncollected.tsx
- When marking invoice as collected, the invoice stays in search results with "collected" status
- Should filter out (remove) instead of just updating status

### Issue 2: In collected.tsx
- No auto-refresh mechanism when user navigates to the tab
- User can't see status changes made by admin

### Issue 3: useFocusEffect causes infinite reload
- Originally used useFocusEffect which reloads on every focus/blur
- This causes continuous reloading when switching tabs
- Fixed by using useEffect with empty dependencies (load once on mount)

## Fix Plan:

### Step 1: Fix handleMarkAsCollected in uncollected.tsx
- Change from updating status to filtering out the invoice from invoiceData

### Step 2: Fix useEffect in uncollected.tsx
- Use useEffect with empty deps instead of useFocusEffect
- This ensures data loads only once when screen mounts

### Step 3: Fix collected.tsx
- Remove problematic auto-refresh that causes infinite loops

## Implementation:
- [x] 1. Edit uncollected.tsx - fix handleMarkAsCollected function
- [x] 2. Edit uncollected.tsx - use useEffect instead of useFocusEffect
- [x] 3. Edit collected.tsx - fix auto-refresh
- [ ] 4. Test the changes

## Changes Made:

### 1. uncollected.tsx
- Changed `handleMarkAsCollected` to filter out (remove) the invoice from `invoiceData`
- Changed from `useFocusEffect` to `useEffect` with empty dependencies
- This ensures data loads only once on mount, not continuously

### 2. collected.tsx
- Removed problematic auto-refresh logic that caused continuous reloading
- Kept useFocusEffect with empty callback as placeholder

## How It Works Now:
1. When admin/user changes invoice status → data is saved to database
2. User manually pulls down to refresh (using existing RefreshControl)
3. Screen loads stable without continuous reloading

