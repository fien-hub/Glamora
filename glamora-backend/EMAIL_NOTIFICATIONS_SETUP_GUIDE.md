# 📧 Email Notifications Setup Guide

## Overview

This guide explains how to set up email notifications for custom service approvals and rejections using Supabase Edge Functions and Resend.

---

## 🎯 What's Included

### **1. Email Templates**
- ✅ `custom-service-approved.html` - Beautiful approval email
- ✅ `custom-service-rejected.html` - Rejection email with reason
- ✅ Responsive design with Glamora branding
- ✅ Professional HTML email format

### **2. Supabase Edge Function**
- ✅ `send-custom-service-email` - Sends emails via Resend API
- ✅ Fetches service and provider details
- ✅ Handles both approval and rejection emails
- ✅ Error handling and logging

### **3. Database Integration**
- ✅ Updated `approve_custom_service()` function
- ✅ Updated `reject_custom_service()` function
- ✅ Automatic email triggering via pg_net extension

---

## 📋 Prerequisites

1. **Supabase Project** - Your Glamora backend project
2. **Resend Account** - Free tier available at [resend.com](https://resend.com)
3. **Supabase CLI** - For deploying Edge Functions
4. **Domain (Optional)** - For custom email sender address

---

## 🚀 Step-by-Step Setup

### **Step 1: Create Resend Account**

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address
3. Go to **API Keys** section
4. Click **Create API Key**
5. Name it "Glamora Notifications"
6. Copy the API key (starts with `re_`)

**Free Tier Limits:**
- 100 emails/day
- 3,000 emails/month
- Perfect for testing and small-scale use

---

### **Step 2: Add Domain (Optional but Recommended)**

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `glamora.com`)
4. Add the DNS records to your domain provider
5. Wait for verification (usually 5-10 minutes)

**Without Domain:**
- Emails will be sent from `onboarding@resend.dev`
- Still works, but looks less professional

**With Domain:**
- Emails sent from `notifications@glamora.com`
- Better deliverability and branding

---

### **Step 3: Deploy Edge Function**

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   cd glamora-backend
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Set the Resend API key as a secret**:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

5. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-custom-service-email
   ```

6. **Verify deployment**:
   ```bash
   supabase functions list
   ```

---

### **Step 4: Enable pg_net Extension**

The `pg_net` extension allows database functions to make HTTP requests.

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

---

### **Step 5: Set Supabase Configuration**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this SQL to set configuration:
   ```sql
   -- Set Supabase URL
   ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
   
   -- Set Service Role Key (find in Settings > API)
   ALTER DATABASE postgres SET app.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
   ```

3. Replace:
   - `YOUR_PROJECT_REF` with your project reference
   - `YOUR_SERVICE_ROLE_KEY` with your service role key from Settings > API

---

### **Step 6: Run Email Notification Migration**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/migrations/add_email_notifications.sql`
4. Paste and click **Run**
5. Verify no errors

---

### **Step 7: Test Email Notifications**

#### **Test Approval Email:**

```sql
-- First, create a test custom service (if you don't have one)
INSERT INTO provider_services (
  provider_id,
  custom_service_name,
  price,
  duration,
  is_custom,
  custom_service_status
)
VALUES (
  'YOUR_PROVIDER_ID',
  'Test Lash Lift',
  45.00,
  60,
  true,
  'pending'
)
RETURNING id;

-- Then approve it (replace with the ID from above)
SELECT approve_custom_service('SERVICE_ID_HERE');
```

#### **Test Rejection Email:**

```sql
SELECT reject_custom_service(
  'SERVICE_ID_HERE',
  'This is a test rejection to verify email notifications are working'
);
```

#### **Check Results:**

1. **In-app notification** should appear in the `notifications` table
2. **Email** should be sent to the provider's email
3. **Check Resend dashboard** for email delivery status
4. **Check provider's inbox** for the email

---

## 🎨 Email Template Customization

### **Update Sender Name/Email**

Edit `supabase/functions/send-custom-service-email/index.ts`:

```typescript
from: 'Glamora <notifications@yourdomain.com>',
```

### **Update Email Content**

The templates are embedded in the Edge Function. To customize:

1. Edit the `getApprovedTemplate()` or `getRejectedTemplate()` functions
2. Modify the HTML content
3. Redeploy the function:
   ```bash
   supabase functions deploy send-custom-service-email
   ```

### **Use External Templates**

For easier editing, you can store templates in Supabase Storage:

1. Upload templates to Storage bucket
2. Fetch template in Edge Function
3. Replace placeholders with service data

---

## 📊 Monitoring Email Delivery

### **Resend Dashboard**

1. Go to [resend.com/emails](https://resend.com/emails)
2. View all sent emails
3. Check delivery status
4. View email content
5. See bounce/complaint rates

### **Supabase Logs**

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on `send-custom-service-email`
3. View **Logs** tab
4. Check for errors or successful sends

### **Database Analytics**

Query the analytics table:

```sql
-- Count emails sent today
SELECT 
  event_type,
  COUNT(*) as count
FROM custom_service_analytics
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY event_type;
```

---

## 🔧 Troubleshooting

### **Emails Not Sending**

1. **Check Resend API Key**:
   ```bash
   supabase secrets list
   ```
   Verify `RESEND_API_KEY` is set

2. **Check Edge Function Logs**:
   - Go to Dashboard → Edge Functions → Logs
   - Look for error messages

3. **Check pg_net Extension**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

4. **Check Configuration**:
   ```sql
   SHOW app.supabase_url;
   SHOW app.supabase_service_role_key;
   ```

### **Emails Going to Spam**

1. **Add Domain** to Resend (see Step 2)
2. **Set up SPF/DKIM** records
3. **Warm up domain** by sending gradually
4. **Avoid spam trigger words** in subject/content

### **Wrong Email Content**

1. Check service data in database
2. Verify template placeholders match data
3. Check Edge Function logs for errors
4. Test with known good data

---

## 💰 Cost Considerations

### **Resend Pricing**

- **Free Tier**: 100 emails/day, 3,000/month
- **Pro Tier**: $20/month for 50,000 emails
- **Enterprise**: Custom pricing

### **Supabase Edge Functions**

- **Free Tier**: 500,000 invocations/month
- **Pro Tier**: 2,000,000 invocations/month
- Each email = 1 invocation

### **Estimated Costs**

For 1,000 custom services/month:
- Resend: Free (under 3,000)
- Supabase: Free (under 500,000)
- **Total: $0/month**

---

## 🎯 Next Steps

### **Phase 2 Enhancements:**

- [ ] Add email templates for other events (booking confirmations, etc.)
- [ ] Implement email preferences (allow users to opt-out)
- [ ] Add email scheduling (send at optimal times)
- [ ] Create email analytics dashboard
- [ ] Add A/B testing for email content
- [ ] Implement email retry logic for failures
- [ ] Add SMS notifications as backup

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_net Extension](https://supabase.com/docs/guides/database/extensions/pg_net)
- [HTML Email Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)

---

**Email notifications are now set up! Providers will receive beautiful, branded emails when their custom services are approved or rejected.** 📧✨

