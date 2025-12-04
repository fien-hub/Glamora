# 🧪 Glamora Social Feed - Testing Guide

## Overview
This guide provides comprehensive testing procedures for the new social discovery feed and engagement features.

## 🚀 Getting Started

### Start the App
```bash
cd glamora-app
npm start
```

## 📋 Key Test Cases

### 1. Feed Loading
- Initial load with spinner
- Empty state display
- Error state with retry button

### 2. Engagement Features
- Like/unlike with haptic feedback
- Save/unsave with haptic feedback
- View tracking
- Login required alerts

### 3. Location & Proximity
- GPS location button
- Distance-based sorting
- Manual location input

### 4. Category Filtering
- Filter by category
- Switch between categories
- "All" shows all posts

### 5. Infinite Scroll
- Load more on scroll
- Pagination works correctly
- No duplicate posts

### 6. Pull to Refresh
- Branded refresh control
- Reloads from page 0
- Clears errors

## 🗄️ Database Verification

```sql
-- Check likes
SELECT * FROM portfolio_likes ORDER BY created_at DESC LIMIT 10;

-- Check saves
SELECT * FROM portfolio_saves ORDER BY created_at DESC LIMIT 10;

-- Check views
SELECT * FROM portfolio_views ORDER BY created_at DESC LIMIT 10;

-- Test feed function
SELECT * FROM get_personalized_feed(40.7128, -74.0060, NULL, NULL, 0, 10);
```

## ✅ Acceptance Criteria

- [ ] Feed loads successfully
- [ ] Like/unlike works with haptic feedback
- [ ] Save/unsave works with haptic feedback
- [ ] View tracking records correctly
- [ ] Location-based sorting works
- [ ] Category filtering works
- [ ] Infinite scroll works
- [ ] Pull to refresh works
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] All data persists in database
- [ ] RLS policies work correctly
- [ ] Cross-platform tested (iOS & Android)

## 📊 Performance Targets

- Initial feed load: < 2 seconds
- Like/save interaction: < 100ms (optimistic)
- Pagination load: < 1 second
- Distance calculation: < 500ms
