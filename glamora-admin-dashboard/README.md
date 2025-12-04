# 🎨 Glamora Admin Dashboard

## Overview

This is a web-based admin dashboard for reviewing and managing custom service submissions from providers. The dashboard provides a clean, modern interface for approving or rejecting custom services to maintain platform quality.

---

## 🎯 Features

### **Dashboard Overview**
- ✅ Real-time statistics (pending, approved, rejected, avg review time)
- ✅ Pending services count with badge
- ✅ Quick navigation sidebar
- ✅ Responsive design

### **Service Review**
- ✅ View all pending custom services
- ✅ See provider information (name, email, business)
- ✅ View service details (name, description, price, duration)
- ✅ One-click approve
- ✅ Reject with reason modal
- ✅ Visual feedback and animations

### **Filtering & Sorting**
- ✅ Filter by category
- ✅ Sort by newest, oldest, price
- ✅ Search functionality (coming soon)

---

## 📁 Files

- **`index.html`** - Main dashboard HTML
- **`styles.css`** - Complete styling
- **`script.js`** - Interactive functionality
- **`README.md`** - This file

---

## 🚀 How to Use

### **Option 1: Open Locally**

1. Navigate to the folder:
   ```bash
   cd glamora-admin-dashboard
   ```

2. Open `index.html` in your browser:
   ```bash
   open index.html
   ```
   Or double-click the file.

### **Option 2: Run with Live Server**

1. Install Live Server (VS Code extension) or use Python:
   ```bash
   python3 -m http.server 8000
   ```

2. Open in browser:
   ```
   http://localhost:8000
   ```

---

## 🎨 Design Features

### **Color Palette**
- **Primary (Coral):** `#F4B5A4`
- **Secondary (Lavender):** `#D4C5E8`
- **Success:** `#10B981`
- **Error:** `#EF4444`
- **Warning:** `#F59E0B`
- **Background:** `#F9FAFB`
- **Text:** `#1F2937`

### **Components**
- **Sidebar Navigation** - Fixed left sidebar with icons
- **Stats Cards** - Overview metrics with icons
- **Service Cards** - Detailed service information
- **Modal** - Rejection reason input
- **Notifications** - Toast notifications for actions

---

## 🔧 Integration with Supabase

To connect this dashboard to your Supabase backend:

### **1. Install Supabase JS Client**

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### **2. Initialize Supabase**

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
```

### **3. Fetch Pending Services**

```javascript
async function fetchPendingServices() {
    const { data, error } = await supabase
        .from('pending_custom_services')
        .select('*')
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    renderServices(data);
}
```

### **4. Approve Service**

```javascript
async function approveService(serviceId) {
    const { error } = await supabase.rpc('approve_custom_service', {
        service_id: serviceId
    });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    // Refresh list
    fetchPendingServices();
}
```

### **5. Reject Service**

```javascript
async function rejectService(serviceId, reason) {
    const { error } = await supabase.rpc('reject_custom_service', {
        service_id: serviceId,
        rejection_reason: reason
    });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    // Refresh list
    fetchPendingServices();
}
```

---

## 📊 Analytics Integration

### **Fetch Overall Stats**

```javascript
async function fetchStats() {
    const { data, error } = await supabase
        .from('custom_service_stats_overall')
        .select('*')
        .single();
    
    if (data) {
        updateStatsCards(data);
    }
}
```

### **Fetch Pending Count**

```javascript
async function fetchPendingCount() {
    const { data, error } = await supabase
        .from('pending_custom_services_count')
        .select('*')
        .single();
    
    if (data) {
        updatePendingBadge(data.pending_count);
    }
}
```

---

## 🎯 Navigation Pages

The sidebar includes links to:

1. **Dashboard** - Overview and stats
2. **Pending Services** - Review queue (current page)
3. **Analytics** - Detailed analytics and trends
4. **Approved** - List of approved services
5. **Rejected** - List of rejected services
6. **Services to Add** - Popular custom services (3+ providers)
7. **Providers** - Provider management
8. **Settings** - Admin settings

---

## 🔐 Authentication

To add authentication:

### **1. Add Login Page**

Create `login.html` with Supabase auth:

```javascript
async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        alert('Login failed');
        return;
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
    
    if (profile.role !== 'admin') {
        alert('Access denied');
        await supabase.auth.signOut();
        return;
    }
    
    // Redirect to dashboard
    window.location.href = 'index.html';
}
```

### **2. Protect Dashboard**

Add to `index.html`:

```javascript
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile.role !== 'admin') {
        alert('Access denied');
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    }
}

// Run on page load
checkAuth();
```

---

## 🎨 Customization

### **Change Colors**

Edit `styles.css`:

```css
/* Primary color */
.nav-item.active {
    background: #YOUR_COLOR;
}

/* Buttons */
.btn-approve {
    background: #YOUR_COLOR;
}
```

### **Add New Pages**

1. Create new HTML file (e.g., `analytics.html`)
2. Copy structure from `index.html`
3. Update sidebar link
4. Add page-specific content

---

## 📱 Responsive Design

The dashboard is fully responsive:

- **Desktop (1024px+):** Full sidebar + grid layout
- **Tablet (768px-1024px):** Smaller sidebar + single column
- **Mobile (<768px):** Hidden sidebar + mobile-optimized layout

---

## 🚀 Deployment

### **Option 1: Vercel**

```bash
npm install -g vercel
vercel
```

### **Option 2: Netlify**

Drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)

### **Option 3: GitHub Pages**

1. Push to GitHub
2. Go to Settings > Pages
3. Select branch and folder
4. Save

---

## 🎉 Features to Add

### **Phase 2 Enhancements:**

- [ ] Real-time updates with Supabase subscriptions
- [ ] Bulk approve/reject
- [ ] Advanced filtering (date range, provider)
- [ ] Export to CSV
- [ ] Email notifications to providers
- [ ] Service history timeline
- [ ] Provider reputation scores
- [ ] Analytics charts (Chart.js)
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts

---

## 📞 Support

For questions or issues:
- Review the Supabase integration docs
- Check browser console for errors
- Verify API endpoints are correct
- Ensure admin role is set in database

---

## 🎨 Screenshots

The dashboard includes:
- Clean, modern design
- Intuitive navigation
- Visual feedback for actions
- Responsive layout
- Professional color scheme

---

**Ready to review custom services and maintain platform quality!** 🚀

