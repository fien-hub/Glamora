# Analytics Dashboard Setup Guide

## 📊 Overview

The analytics dashboard provides real-time insights into bookings from service-tagged portfolio posts.

---

## 🚀 Quick Setup

### Step 1: Configure Supabase Credentials

1. **Open `analytics.js`**
2. **Replace the placeholder values** at the top of the file:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase anon key
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Click on "Settings" → "API"
- Copy the "Project URL" (SUPABASE_URL)
- Copy the "anon public" key (SUPABASE_ANON_KEY)

### Step 2: Open the Dashboard

1. **Navigate to the admin dashboard folder:**
   ```bash
   cd glamora-admin-dashboard
   ```

2. **Start a local server:**
   ```bash
   # Option 1: Using Python
   python3 -m http.server 8000
   
   # Option 2: Using Node.js (if you have http-server installed)
   npx http-server -p 8000
   
   # Option 3: Using PHP
   php -S localhost:8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000/analytics.html
   ```

---

## 📈 Dashboard Features

### Key Metrics Cards

1. **Conversion Rate**
   - Percentage of users who complete booking after starting from tagged post
   - Formula: (Completed Bookings / Started Bookings) × 100

2. **Revenue from Tagged Posts**
   - Total revenue generated from bookings originating from tagged posts
   - Displayed in dollars

3. **Total Bookings**
   - Count of completed bookings from tagged posts
   - Shows absolute number

4. **Average Booking Value**
   - Average revenue per booking from tagged posts
   - Formula: Total Revenue / Total Bookings

### Charts

1. **Bookings Over Time**
   - Line chart showing daily booking trends
   - Helps identify peak booking days
   - Smooth curve for better visualization

2. **Conversion Funnel**
   - Bar chart comparing started vs completed bookings
   - Visual representation of drop-off
   - Helps identify conversion issues

### Tables

1. **Top Performing Services**
   - Shows which services convert best from tagged posts
   - Columns: Service Name, Bookings, Revenue, Avg Value
   - Sorted by number of bookings

2. **Top Performing Providers**
   - Shows which providers benefit most from tagged posts
   - Columns: Provider ID, Bookings, Revenue
   - Sorted by revenue

---

## 🔄 Time Range Filter

Use the dropdown in the top-right to filter data:
- **Last 7 days** - Recent performance
- **Last 30 days** - Monthly trends (default)
- **Last 90 days** - Quarterly overview
- **Last year** - Annual performance

---

## 🎯 How to Use the Dashboard

### For Platform Admins

1. **Monitor Overall Performance**
   - Check conversion rate to ensure tagged posts are effective
   - Track revenue to measure ROI of the feature

2. **Identify Top Performers**
   - See which services work best with tagged posts
   - Identify providers who use the feature effectively

3. **Optimize the Feature**
   - If conversion rate is low, consider UX improvements
   - If certain services perform well, promote them more

### For Business Decisions

1. **Feature Validation**
   - Is the tagged post feature driving bookings?
   - Is the revenue significant enough to justify the feature?

2. **Provider Education**
   - Show providers which of their services perform best
   - Encourage tagging posts with high-performing services

3. **Marketing Insights**
   - Understand which services customers book from posts
   - Use insights for targeted marketing campaigns

---

## 📊 Analytics Events Tracked

The dashboard queries these events from the `analytics_events` table:

1. **`booking_from_tagged_post`**
   - When: User enters booking screen from tagged post
   - Properties: portfolio_item_id, provider_id, service_id, service_name

2. **`booking_completed`**
   - When: Any booking is completed
   - Properties: booking_id, provider_id, service_id, from_tagged_post, prices

3. **`tagged_post_booking_completed`**
   - When: Booking from tagged post is completed
   - Properties: booking_id, portfolio_item_id, provider_id, service_id, service_name, total_price

---

## 🐛 Troubleshooting

### Dashboard shows "Loading..." forever

**Possible causes:**
1. Supabase credentials not configured
2. No internet connection
3. `analytics_events` table doesn't exist

**Solutions:**
1. Check `analytics.js` has correct SUPABASE_URL and SUPABASE_ANON_KEY
2. Check browser console for errors (F12 → Console tab)
3. Verify `analytics_events` table exists in Supabase

### Dashboard shows "No data available"

**Possible causes:**
1. No bookings from tagged posts yet
2. Time range filter too narrow
3. Analytics events not being tracked

**Solutions:**
1. Test the booking flow to generate data
2. Expand time range to "Last year"
3. Check if analytics events are being saved to database

### Charts not displaying

**Possible causes:**
1. Chart.js library not loaded
2. Browser compatibility issue

**Solutions:**
1. Check browser console for errors
2. Try a different browser (Chrome recommended)
3. Clear browser cache and reload

---

## 🔒 Security Notes

- The dashboard uses the **anon key**, which is safe for client-side use
- Row Level Security (RLS) policies should be configured on `analytics_events` table
- For production, consider adding authentication to the admin dashboard
- Never expose the **service role key** in client-side code

---

## 🚀 Next Steps

1. **Add Authentication**
   - Protect the dashboard with login
   - Use Supabase Auth for admin users

2. **Add More Metrics**
   - Time to booking (how long from post view to booking)
   - Post engagement metrics (likes, views)
   - Provider-specific dashboards

3. **Export Functionality**
   - Export data to CSV
   - Generate PDF reports
   - Schedule automated reports

4. **Real-time Updates**
   - Use Supabase Realtime to update dashboard live
   - Show notifications for new bookings

---

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Analytics Best Practices](https://supabase.com/docs/guides/analytics)

---

## ✅ Setup Checklist

- [ ] Configure Supabase credentials in `analytics.js`
- [ ] Start local server
- [ ] Open dashboard in browser
- [ ] Verify data loads correctly
- [ ] Test time range filter
- [ ] Check all charts display
- [ ] Verify tables populate
- [ ] Test refresh button

---

**Dashboard is ready to use!** 🎉

Open `http://localhost:8000/analytics.html` in your browser to view the analytics.

