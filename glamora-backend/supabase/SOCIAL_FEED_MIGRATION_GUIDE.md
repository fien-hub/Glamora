# 🎨 Social Feed Database Migration Guide

**Created**: 2025-11-18
**Purpose**: Add social discovery feed functionality to Glamora

---

## 📋 Overview

This guide covers the database changes needed to support the new social discovery feed feature, including:
- Portfolio visibility controls
- Feed engagement tracking (likes, saves, views)
- Proximity-based feed algorithm
- Row Level Security policies

---

## 🗄️ New Database Features

### 1. Portfolio Visibility Fields
**File**: `add_social_feed_fields.sql`

**New Columns**:
- `portfolio_items.is_visible` - Controls feed visibility (default: true)
- `portfolio_items.is_featured` - Marks featured/promoted items
- `portfolio_items.featured_at` - Timestamp for featured items
- `provider_profiles.avatar_url` - Cached provider photo

**Indexes**:
- `idx_portfolio_items_visible` - Fast queries for visible items
- `idx_portfolio_items_featured` - Fast queries for featured items

---

### 2. Feed Engagement Tables
**File**: `add_feed_engagement.sql`

**New Tables**:

#### `portfolio_likes`
Tracks customer likes on portfolio items
- `id` (UUID, PK)
- `portfolio_item_id` (UUID, FK)
- `customer_id` (UUID, FK)
- `created_at` (TIMESTAMPTZ)
- Unique constraint: (portfolio_item_id, customer_id)

#### `portfolio_saves`
Tracks customer saves/bookmarks
- `id` (UUID, PK)
- `portfolio_item_id` (UUID, FK)
- `customer_id` (UUID, FK)
- `created_at` (TIMESTAMPTZ)
- Unique constraint: (portfolio_item_id, customer_id)

#### `portfolio_views`
Tracks views for analytics
- `id` (UUID, PK)
- `portfolio_item_id` (UUID, FK)
- `customer_id` (UUID, FK, nullable)
- `viewed_at` (TIMESTAMPTZ)

**Triggers**:
- Auto-updates `like_count` on portfolio_items when likes added/removed
- Auto-updates `view_count` on portfolio_items when views recorded

---

### 3. Feed Algorithm Functions
**File**: `add_feed_algorithm.sql`

**New Functions**:

#### `calculate_distance(lat1, lon1, lat2, lon2)`
Calculates distance in kilometers using Haversine formula
- Returns: DECIMAL (distance in km)
- Immutable function for performance

#### `get_personalized_feed(...)`
Returns personalized feed sorted by proximity, engagement, and recency
- Parameters:
  - `customer_lat` - Customer latitude
  - `customer_lon` - Customer longitude
  - `customer_id_param` - Customer ID (for likes/saves)
  - `category_filter` - Optional category filter
  - `page_num` - Page number (default: 0)
  - `page_size` - Items per page (default: 10)
- Returns: Table with portfolio items, provider info, distance, engagement
- Sorting: Featured → Distance → Engagement → Recency

#### `get_trending_portfolio(days_back, limit_count)`
Returns trending items based on engagement score
- Parameters:
  - `days_back` - Days to look back (default: 7)
  - `limit_count` - Max items to return (default: 20)
- Returns: Table with portfolio items and engagement scores
- Score: (likes * 10 + views) * recency_weight

---

### 4. Row Level Security Policies
**File**: `add_feed_rls_policies.sql`

**New Policies**:

#### Portfolio Likes
- ✅ Anyone can view likes (for counts)
- ✅ Customers can like items
- ✅ Customers can unlike their own likes

#### Portfolio Saves
- ✅ Customers can view their own saves
- ✅ Customers can save items
- ✅ Customers can unsave their own saves

#### Portfolio Views
- ✅ Anyone can record views
- ✅ Providers can view their own analytics

#### Portfolio Items
- ✅ Anyone can view visible items (is_visible = true)
- ✅ Providers can manage their own items

---

## 🚀 How to Run Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to backend directory
cd glamora-backend/supabase

# Link to your project (if not already linked)
supabase link --project-ref hygbxfkkdmenpkvgpwhn

# Run the new migrations
supabase db push

# Or run individual migrations
psql $DATABASE_URL -f migrations/add_social_feed_fields.sql
psql $DATABASE_URL -f migrations/add_feed_engagement.sql
psql $DATABASE_URL -f migrations/add_feed_algorithm.sql
psql $DATABASE_URL -f migrations/add_feed_rls_policies.sql
```

### Option 2: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/hygbxfkkdmenpkvgpwhn
2. Navigate to **SQL Editor**
3. Copy and paste each migration file content
4. Run in order:
   1. `add_social_feed_fields.sql`
   2. `add_feed_engagement.sql`
   3. `add_feed_algorithm.sql`
   4. `add_feed_rls_policies.sql`

---

## 🧪 Testing the Migrations

After running migrations, test with these queries:

```sql
-- Test 1: Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'portfolio_items' 
AND column_name IN ('is_visible', 'is_featured');

-- Test 2: Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('portfolio_likes', 'portfolio_saves', 'portfolio_views');

-- Test 3: Test distance calculation
SELECT calculate_distance(40.7128, -74.0060, 34.0522, -118.2437) AS distance_km;
-- Should return ~3936 km (NYC to LA)

-- Test 4: Test personalized feed function
SELECT * FROM get_personalized_feed(40.7128, -74.0060, NULL, NULL, 0, 5);

-- Test 5: Test trending function
SELECT * FROM get_trending_portfolio(7, 10);
```

---

## 📊 Migration Impact

**Tables Modified**: 2
- `portfolio_items` - Added 3 columns
- `provider_profiles` - Added 1 column

**Tables Created**: 3
- `portfolio_likes`
- `portfolio_saves`
- `portfolio_views`

**Functions Created**: 3
- `calculate_distance`
- `get_personalized_feed`
- `get_trending_portfolio`

**Triggers Created**: 2
- `trigger_update_portfolio_like_count`
- `trigger_update_portfolio_view_count`

**RLS Policies Created**: 9

---

## ⚠️ Important Notes

1. **Existing Data**: All existing portfolio items will have `is_visible = true` by default
2. **Performance**: New indexes created for optimal query performance
3. **Security**: RLS policies ensure customers can only manage their own likes/saves
4. **Analytics**: View tracking is anonymous-friendly (customer_id is nullable)
5. **Backward Compatible**: Existing queries will continue to work

---

## 🔄 Rollback (If Needed)

If you need to rollback these changes:

```sql
-- Drop new tables
DROP TABLE IF EXISTS public.portfolio_views CASCADE;
DROP TABLE IF EXISTS public.portfolio_saves CASCADE;
DROP TABLE IF EXISTS public.portfolio_likes CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS get_trending_portfolio;
DROP FUNCTION IF EXISTS get_personalized_feed;
DROP FUNCTION IF EXISTS calculate_distance;

-- Remove new columns
ALTER TABLE public.portfolio_items 
DROP COLUMN IF EXISTS is_visible,
DROP COLUMN IF EXISTS is_featured,
DROP COLUMN IF EXISTS featured_at;

ALTER TABLE public.provider_profiles 
DROP COLUMN IF EXISTS avatar_url;
```

---

**Ready to run! These migrations will enable the social discovery feed feature.** 🚀

