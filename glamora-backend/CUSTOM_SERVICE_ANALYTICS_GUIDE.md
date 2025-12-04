# 📊 Custom Service Analytics Guide

## Overview

The Glamora platform now includes comprehensive analytics tracking for custom service submissions, approvals, and rejections. This guide explains how to access and use the analytics data.

---

## 🎯 What's Tracked

### **Events Tracked:**

1. **`submitted`** - When a provider submits a custom service
2. **`approved`** - When an admin approves a custom service
3. **`rejected`** - When an admin rejects a custom service

### **Data Captured:**

- Provider information (ID, name, business name)
- Service details (name, price, duration, description)
- Timestamps for all events
- Rejection reasons (for rejected services)
- Reviewer information (admin who approved/rejected)

---

## 📊 Pre-Built Analytics Views

### **1. Overall Statistics**

```sql
SELECT * FROM custom_service_stats_overall;
```

**Returns:**
- Total submitted
- Total approved
- Total rejected
- Approval rate (%)
- Rejection rate (%)

**Example Output:**
```
total_submitted | total_approved | total_rejected | approval_rate_percent | rejection_rate_percent
----------------|----------------|----------------|----------------------|----------------------
      150       |      120       |       30       |        80.00         |        20.00
```

---

### **2. Daily Statistics (Last 30 Days)**

```sql
SELECT * FROM custom_service_stats_by_date;
```

**Returns:**
- Date
- Submissions per day
- Approvals per day
- Rejections per day

**Use Case:** Track daily trends and identify busy periods

---

### **3. Most Common Custom Services**

```sql
SELECT * FROM most_common_custom_services;
```

**Returns:**
- Custom service name
- Number of times submitted
- Number of times approved
- Number of times rejected
- Last submission date

**Use Case:** Identify services that should be added to the platform

**Example Output:**
```
custom_service_name    | submission_count | approved_count | rejected_count
-----------------------|------------------|----------------|---------------
Lash Lift              |        15        |       12       |       3
Brow Lamination        |        12        |       10       |       2
Keratin Treatment      |        10        |        8       |       2
```

---

### **4. Rejection Reasons**

```sql
SELECT * FROM custom_service_rejection_reasons;
```

**Returns:**
- Custom service name
- Rejection reason
- Rejected date
- Provider name
- Business name

**Use Case:** Understand why services are being rejected, identify patterns

---

### **5. Provider Activity**

```sql
SELECT * FROM provider_custom_service_activity;
```

**Returns:**
- Provider ID and name
- Business name
- Total submitted
- Total approved
- Total rejected
- Last submission date

**Use Case:** Identify active providers, spot potential issues

---

### **6. Review Times**

```sql
SELECT * FROM custom_service_review_times;
```

**Returns:**
- Average review time (hours)
- Minimum review time (hours)
- Maximum review time (hours)
- Total reviewed

**Use Case:** Monitor admin response time, set SLA targets

**Example Output:**
```
avg_review_hours | min_review_hours | max_review_hours | total_reviewed
-----------------|------------------|------------------|---------------
      4.5        |       0.5        |       48.0       |      150
```

---

### **7. Pending Services Count**

```sql
SELECT * FROM pending_custom_services_count;
```

**Returns:**
- Number of pending services
- Oldest pending date
- Newest pending date

**Use Case:** Monitor admin workload, ensure timely reviews

---

### **8. Weekly Trends**

```sql
SELECT * FROM custom_service_trends_weekly;
```

**Returns:**
- Week start date
- Submissions per week
- Approvals per week
- Rejections per week
- Approval rate (%)

**Use Case:** Identify weekly patterns, plan admin capacity

---

### **9. Monthly Trends**

```sql
SELECT * FROM custom_service_trends_monthly;
```

**Returns:**
- Month start date
- Submissions per month
- Approvals per month
- Rejections per month
- Approval rate (%)

**Use Case:** Long-term trend analysis, business planning

---

### **10. Services to Add to Platform**

```sql
SELECT * FROM services_to_add_to_platform;
```

**Returns:**
- Custom service name
- Number of unique providers offering it
- Times approved
- Average price
- Average duration
- Last approved date

**Criteria:** Services approved by 3+ different providers

**Use Case:** Identify popular services that should be added as predefined options

**Example Output:**
```
custom_service_name | unique_providers | times_approved | avg_price | avg_duration
--------------------|------------------|----------------|-----------|-------------
Lash Lift           |        8         |       12       |   45.00   |     60
Brow Lamination     |        6         |       10       |   35.00   |     45
```

---

## 🔍 Custom Queries

### **Find Services Rejected Multiple Times**

```sql
SELECT 
    custom_service_name,
    COUNT(*) as rejection_count,
    ARRAY_AGG(DISTINCT event_data->>'rejection_reason') as reasons
FROM custom_service_analytics
WHERE event_type = 'rejected'
GROUP BY custom_service_name
HAVING COUNT(*) >= 3
ORDER BY rejection_count DESC;
```

---

### **Provider Success Rate**

```sql
SELECT 
    provider_id,
    business_name,
    total_submitted,
    total_approved,
    ROUND(
        (total_approved::NUMERIC / NULLIF(total_submitted, 0)) * 100, 
        2
    ) as success_rate_percent
FROM provider_custom_service_activity
WHERE total_submitted >= 3
ORDER BY success_rate_percent DESC;
```

---

### **Busiest Days of Week**

```sql
SELECT 
    TO_CHAR(created_at, 'Day') as day_of_week,
    COUNT(*) as submission_count
FROM custom_service_analytics
WHERE event_type = 'submitted'
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
ORDER BY EXTRACT(DOW FROM created_at);
```

---

### **Average Price by Service Type**

```sql
SELECT 
    custom_service_name,
    COUNT(*) as count,
    AVG((event_data->>'base_price')::NUMERIC / 100) as avg_price_dollars,
    MIN((event_data->>'base_price')::NUMERIC / 100) as min_price_dollars,
    MAX((event_data->>'base_price')::NUMERIC / 100) as max_price_dollars
FROM custom_service_analytics
WHERE event_type = 'submitted'
  AND event_data->>'base_price' IS NOT NULL
GROUP BY custom_service_name
HAVING COUNT(*) >= 3
ORDER BY avg_price_dollars DESC;
```

---

## 📈 Key Metrics to Monitor

### **1. Approval Rate**
- **Target:** > 70%
- **Action if low:** Review rejection reasons, improve provider guidance

### **2. Average Review Time**
- **Target:** < 24 hours
- **Action if high:** Add more admin reviewers, automate simple approvals

### **3. Pending Count**
- **Target:** < 10 pending at any time
- **Action if high:** Prioritize reviews, add admin capacity

### **4. Repeat Rejections**
- **Target:** < 5% of providers have multiple rejections
- **Action if high:** Improve onboarding education, add examples

---

## 🚨 Alerts to Set Up

### **1. High Pending Count**
```sql
-- Alert if more than 20 services pending
SELECT pending_count 
FROM pending_custom_services_count 
WHERE pending_count > 20;
```

### **2. Old Pending Services**
```sql
-- Alert if any service pending > 48 hours
SELECT * 
FROM pending_custom_services 
WHERE created_at < NOW() - INTERVAL '48 hours';
```

### **3. Low Approval Rate**
```sql
-- Alert if weekly approval rate < 60%
SELECT * 
FROM custom_service_trends_weekly 
WHERE approval_rate_percent < 60 
ORDER BY week_start DESC 
LIMIT 1;
```

---

## 📊 Dashboard Recommendations

### **Admin Dashboard Should Show:**

1. **Top Metrics Card:**
   - Pending count (with alert if > 10)
   - Average review time
   - This week's approval rate

2. **Trends Chart:**
   - Weekly submissions, approvals, rejections (line chart)

3. **Services to Add:**
   - List from `services_to_add_to_platform` view

4. **Recent Activity:**
   - Last 10 submissions with status

5. **Rejection Reasons:**
   - Pie chart of most common rejection reasons

---

## 🔐 Access Control

All analytics views are restricted to admin users only via RLS policies.

**To grant analytics access:**

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

---

## 📞 Example API Calls (from Admin Dashboard)

### **Get Overall Stats:**
```typescript
const { data } = await supabase
  .from('custom_service_stats_overall')
  .select('*')
  .single();
```

### **Get Weekly Trends:**
```typescript
const { data } = await supabase
  .from('custom_service_trends_weekly')
  .select('*')
  .order('week_start', { ascending: false })
  .limit(12);
```

### **Get Pending Count:**
```typescript
const { data } = await supabase
  .from('pending_custom_services_count')
  .select('*')
  .single();
```

---

## 🎯 Business Insights

### **Use Analytics To:**

1. **Identify Platform Gaps**
   - Services requested by many providers should be added

2. **Improve Provider Education**
   - Common rejection reasons indicate need for better guidance

3. **Optimize Admin Resources**
   - Review time trends help plan admin capacity

4. **Track Platform Growth**
   - Submission trends show provider engagement

5. **Ensure Quality**
   - Approval rates indicate quality control effectiveness

---

## ✅ Success Metrics

- **Approval Rate:** 70-85% (shows good quality control + reasonable standards)
- **Review Time:** < 24 hours (shows responsive admin team)
- **Pending Count:** < 10 (shows efficient processing)
- **Repeat Submissions:** 10-20% (shows providers finding value in custom services)

---

## 📞 Support

For questions about analytics or to request new views, contact the development team.

