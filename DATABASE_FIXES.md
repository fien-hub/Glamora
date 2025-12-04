# Database Fixes Required

## Issues Found

1. **Feed Posts Error**: `get_feed_posts` function returns wrong type for `distance_km` column (numeric instead of double precision)
2. **Portfolio Items Missing Columns**: `like_count`, `view_count`, and `service_category` columns don't exist
3. **Portfolio Items Missing Columns**: `caption` and `display_order` were added but counts are missing

## How to Apply Fixes

### Option 1: Run SQL in Supabase Dashboard (RECOMMENDED)

1. Go to: https://supabase.com/dashboard/project/hygbxfkkdmenpkvgpwhn/sql/new
2. Copy and paste the entire SQL from `supabase/migrations/20250120_fix_portfolio_and_feed.sql`
3. Click "Run"

### Option 2: Use the Migration File

The migration file is located at:
```
supabase/migrations/20250120_fix_portfolio_and_feed.sql
```

## What the Migration Does

1. **Adds missing columns to portfolio_items**:
   - `like_count` (INTEGER, default 0)
   - `view_count` (INTEGER, default 0)
   - `service_category` (TEXT, nullable)

2. **Creates helper function** to populate counts from existing data:
   - `update_portfolio_counts()` - counts likes and views from related tables

3. **Creates triggers** to keep counts updated automatically:
   - Increment like_count when a like is added
   - Decrement like_count when a like is removed
   - Increment view_count when a view is added

4. **Fixes get_feed_posts function**:
   - Changes `distance_km` return type from `numeric` to `double precision`
   - Uses the new `like_count` and `view_count` columns instead of counting
   - Removes the LEFT JOIN with portfolio_item_likes (no longer needed)

## Status

- ✅ Migration file created
- ⏳ Needs to be applied to database
- ⏳ App needs to be reloaded after migration

## After Applying

1. Reload the Expo app (press `r` in terminal)
2. Test creating a post
3. Test viewing the feed
4. Verify no more errors in console

