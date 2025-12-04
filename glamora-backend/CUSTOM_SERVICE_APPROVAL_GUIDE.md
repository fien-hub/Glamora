# 🎨 Custom Service Approval System

## Overview

The Glamora platform now includes an approval workflow for custom services to ensure only beauty-related services are added to the platform. This prevents providers from adding inappropriate or non-beauty services.

---

## 🔄 How It Works

### **Provider Flow:**

1. **Provider adds custom service** during onboarding or in their services screen
2. **Service is marked as "Pending Review"** and hidden from search
3. **Provider sees a badge** indicating the service is awaiting approval
4. **Admin reviews** the service
5. **Service is approved or rejected**
   - ✅ **Approved:** Service becomes active and searchable
   - ❌ **Rejected:** Service is hidden, provider is notified with reason

---

## 📊 Database Schema

### **New Fields in `provider_services` Table:**

```sql
custom_service_status          -- ENUM: 'pending', 'approved', 'rejected'
custom_service_rejection_reason -- TEXT: Why service was rejected
custom_service_reviewed_at     -- TIMESTAMPTZ: When reviewed
custom_service_reviewed_by     -- UUID: Admin who reviewed
```

### **Status Values:**

- **`pending`** - Awaiting admin review (default for custom services)
- **`approved`** - Approved by admin, visible in search
- **`rejected`** - Rejected by admin, hidden from search

---

## 🎯 User Experience

### **Provider Onboarding - Step 2 (Service Selection):**

```
┌─────────────────────────────────────────┐
│  Select Your Services                   │
├─────────────────────────────────────────┤
│  [Search services...]                   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Can't find your service?          │ │
│  │ Add a custom one below            │ │
│  │                                   │ │
│  │  [+ Add Custom Service]           │ │
│  │                                   │ │
│  │ ℹ️ Custom services will be        │ │
│  │   reviewed to ensure they're      │ │
│  │   beauty-related                  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Your Services (2)                      │
│  ┌───────────────────────────────────┐ │
│  │ Lash Lift [Pending Review]        │ │
│  │ $45.00 • 60 min                   │ │
│  │ Will be reviewed before appearing │ │
│  │ in search                         │ │
│  │                          [Remove] │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🛠️ Admin Review Interface

### **Custom Service Review Screen:**

Located at: `glamora-app/src/screens/admin/CustomServiceReviewScreen.tsx`

**Features:**
- ✅ View all pending custom services
- ✅ See provider details (name, email, business)
- ✅ View service details (name, description, price, duration)
- ✅ Approve services with one click
- ✅ Reject services with a reason
- ✅ Real-time updates

**Example Card:**

```
┌─────────────────────────────────────────┐
│ Lash Lift                    2024-01-15 │
│ Provider: Sophia Hair Studio (Sophia)   │
│ sophia@example.com                      │
│                                         │
│ "Professional lash lift and tint        │
│  service for natural-looking lashes"    │
│                                         │
│ Price: $45.00    Duration: 60 min       │
│                                         │
│  [✓ Approve]        [✕ Reject]          │
└─────────────────────────────────────────┘
```

---

## 🔧 Database Functions

### **Approve Service:**

```sql
SELECT approve_custom_service('service-uuid-here');
```

**What it does:**
- Sets `custom_service_status` to `'approved'`
- Sets `is_active` to `true`
- Records review timestamp and admin ID
- Service becomes searchable

### **Reject Service:**

```sql
SELECT reject_custom_service(
  'service-uuid-here',
  'Not a beauty service'
);
```

**What it does:**
- Sets `custom_service_status` to `'rejected'`
- Sets `is_active` to `false`
- Stores rejection reason
- Records review timestamp and admin ID
- Service remains hidden

---

## 📝 Migration File

**Location:** `glamora-backend/supabase/migrations/add_custom_service_approval.sql`

**What it includes:**
- ✅ New ENUM type for status
- ✅ New columns in `provider_services`
- ✅ Indexes for performance
- ✅ View for pending services
- ✅ Approval/rejection functions
- ✅ Trigger to auto-set pending status
- ✅ RLS policies for admin access

---

## 🚀 How to Deploy

### **1. Run the Migration:**

```bash
cd glamora-backend
supabase db push
```

Or manually run the SQL file in Supabase dashboard.

### **2. Test the Flow:**

1. Sign up as a provider
2. Add a custom service during onboarding
3. Verify it shows "Pending Review" badge
4. Access admin panel (you'll need admin role)
5. Approve or reject the service
6. Verify status updates correctly

---

## 🔐 Security & Permissions

### **RLS Policies:**

- **Providers** can view their own services (all statuses)
- **Customers** can only see approved services
- **Admins** can view all services and approve/reject

### **Admin Access:**

To grant admin access, update the user's role:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

---

## 📧 Notifications (Future Enhancement)

**Recommended notifications to add:**

1. **Provider notification** when service is approved
2. **Provider notification** when service is rejected (with reason)
3. **Admin notification** when new custom service is submitted
4. **Email notifications** for all above

---

## 🎯 Common Rejection Reasons

**Examples to use:**

- "Not a beauty service"
- "Service too vague - please be more specific"
- "Duplicate of existing service: [Service Name]"
- "Medical procedure - not allowed on platform"
- "Service description needed"

---

## 📊 Monitoring

### **Query Pending Services:**

```sql
SELECT 
  custom_service_name,
  business_name,
  created_at
FROM pending_custom_services
ORDER BY created_at ASC;
```

### **Query Approval Stats:**

```sql
SELECT 
  custom_service_status,
  COUNT(*) as count
FROM provider_services
WHERE custom_service_name IS NOT NULL
GROUP BY custom_service_status;
```

---

## ✅ Testing Checklist

- [ ] Provider can add custom service
- [ ] Custom service shows "Pending Review" badge
- [ ] Custom service is hidden from search
- [ ] Admin can view pending services
- [ ] Admin can approve service
- [ ] Approved service becomes searchable
- [ ] Admin can reject service with reason
- [ ] Rejected service stays hidden
- [ ] Provider sees correct status

---

## 🎉 Benefits

✅ **Quality Control** - Only beauty services on platform  
✅ **User Trust** - Customers see legitimate services  
✅ **Flexibility** - Providers can offer unique services  
✅ **Scalability** - Easy to review and manage  
✅ **Transparency** - Clear feedback to providers  

---

## 📞 Support

For questions or issues with the approval system, contact the development team.

