# 🚀 Custom Service System - Quick Reference

## 📋 Common Operations

### **Deploy the System**

```bash
cd glamora-backend
supabase db push
```

---

### **Grant Admin Access**

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

---

### **Check Pending Services**

```sql
SELECT * FROM pending_custom_services;
```

---

### **Approve a Service**

```sql
SELECT approve_custom_service('service-uuid-here');
```

---

### **Reject a Service**

```sql
SELECT reject_custom_service(
  'service-uuid-here',
  'Not a beauty service'
);
```

---

### **View Overall Stats**

```sql
SELECT * FROM custom_service_stats_overall;
```

---

### **View Pending Count**

```sql
SELECT * FROM pending_custom_services_count;
```

---

### **View Services to Add**

```sql
SELECT * FROM services_to_add_to_platform;
```

---

### **View Recent Rejections**

```sql
SELECT * FROM custom_service_rejection_reasons LIMIT 10;
```

---

## 📊 Key Metrics

| Metric | Query | Target |
|--------|-------|--------|
| Approval Rate | `SELECT approval_rate_percent FROM custom_service_stats_overall` | 70-85% |
| Pending Count | `SELECT pending_count FROM pending_custom_services_count` | < 10 |
| Avg Review Time | `SELECT avg_review_hours FROM custom_service_review_times` | < 24h |

---

## 🔔 Notification Types

- **`custom_service_approved`** - Service approved ✅
- **`custom_service_rejected`** - Service rejected ❌

---

## 📁 Important Files

### **Migrations:**
- `add_custom_service_approval.sql`
- `add_custom_service_notifications.sql`
- `add_custom_service_analytics_views.sql`

### **Components:**
- `NotificationBell.tsx`
- `useNotifications.ts`
- `CustomServiceReviewScreen.tsx`

### **Documentation:**
- `CUSTOM_SERVICE_APPROVAL_GUIDE.md`
- `CUSTOM_SERVICE_ANALYTICS_GUIDE.md`
- `CUSTOM_SERVICE_SYSTEM_COMPLETE.md`

---

## 🎯 Common Rejection Reasons

- "Not a beauty service"
- "Service too vague - please be more specific"
- "Duplicate of existing service: [Name]"
- "Medical procedure - not allowed on platform"
- "Service description needed"

---

## 🚨 Alerts to Monitor

1. **Pending > 20:** Too many pending services
2. **Review time > 48h:** Services waiting too long
3. **Approval rate < 60%:** Standards may be too strict

---

## 📞 Quick Links

- **Approval Guide:** `CUSTOM_SERVICE_APPROVAL_GUIDE.md`
- **Analytics Guide:** `CUSTOM_SERVICE_ANALYTICS_GUIDE.md`
- **Complete Docs:** `CUSTOM_SERVICE_SYSTEM_COMPLETE.md`

---

## ✅ Testing Checklist

- [ ] Provider can add custom service
- [ ] "Pending Review" badge shows
- [ ] Admin can approve/reject
- [ ] Notifications sent correctly
- [ ] Analytics tracking works
- [ ] Service becomes searchable after approval

---

## 🎉 System Status

✅ **Approval Workflow** - Complete  
✅ **Notifications** - Complete  
✅ **Analytics** - Complete  
✅ **Documentation** - Complete  

**Status:** Production Ready 🚀

