# Testing Service Tagging & Booking Flow

## 🚀 App is Running!

The Glamora mobile app is now running on **port 8082**.

**To test on your device:**
1. Open Expo Go app on your phone
2. Scan the QR code in the terminal
3. App will load on your device

---

## 🧪 Test Flow Overview

We'll test the complete flow from uploading a tagged portfolio post to completing a booking.

---

## 📋 Test 1: Upload Portfolio Post with Service Tag

### **As Provider:**

1. **Open the app and log in as a provider**
   - If you don't have a provider account, create one

2. **Navigate to Portfolio screen**
   - Tap on "Portfolio" tab in bottom navigation

3. **Add new portfolio images**
   - Tap the "+" button to add images
   - Select 2-3 images from your device

4. **Tag images with services**
   - Modal should appear showing first image
   - You should see:
     - Progress indicator (e.g., "Image 1 of 3")
     - Progress bar
     - Image preview
     - Caption input field
     - Service selection list
   
5. **For each image:**
   - Select a service from the list (e.g., "Makeup Application")
   - Add a caption (e.g., "Bridal makeup for Sarah's wedding")
   - Tap "Next" to move to next image
   - OR tap "Skip" to skip tagging

6. **Complete upload**
   - After tagging all images, they should upload
   - You should see success message
   - Images should appear in your portfolio

### **Expected Results:**
- ✅ Upload modal shows one image at a time
- ✅ Progress indicator shows current position
- ✅ Service list shows all your active services
- ✅ Can skip images without tagging
- ✅ All images upload successfully
- ✅ Images appear in portfolio

---

## 📋 Test 2: View Tagged Posts in Feed

### **As Customer:**

1. **Log out and log in as a customer**
   - Or use a different device/account

2. **Navigate to Home feed**
   - Should be the default screen

3. **Look for posts with "Bookable" badge**
   - Posts with service tags should show a white badge
   - Badge should say "Bookable" with a pricetag icon
   - Badge should be positioned at top-left of post image

4. **Tap on a tagged post**
   - Post should open in full screen
   - Service information should be visible
   - "Book This Service" button should appear

### **Expected Results:**
- ✅ "Bookable" badge displays on tagged posts
- ✅ Badge is clearly visible and well-positioned
- ✅ Service name and price show correctly
- ✅ "Book This Service" button appears

---

## 📋 Test 3: Book Service from Tagged Post

### **As Customer (continued):**

1. **From the post modal, tap "Book This Service"**
   - Should navigate to booking screen

2. **Verify booking screen state**
   - Service should be **pre-selected** automatically
   - "From Post" badge should appear next to "Select Service" title
   - Pre-selected service card should have special styling (primary color border)
   - Checkmark icon should show on selected service

3. **Complete the booking**
   - Select a date (today or future date)
   - Select a time slot
   - Add notes (optional)
   - Review pricing breakdown
   - Tap "Confirm Booking"

4. **Verify booking confirmation**
   - Success modal should appear
   - Booking details should be correct
   - Service name should match the tagged post

### **Expected Results:**
- ✅ Service is pre-selected when screen opens
- ✅ "From Post" badge displays
- ✅ Service card has special styling
- ✅ Can complete booking successfully
- ✅ Confirmation shows correct details

---

## 📋 Test 4: Verify Analytics Events

### **Check Database:**

1. **Open Supabase Dashboard**
   - Go to SQL Editor

2. **Run this query to see recent analytics events:**
   ```sql
   SELECT 
     event_name,
     properties,
     user_id,
     created_at
   FROM analytics_events
   WHERE event_name IN (
     'booking_from_tagged_post',
     'booking_completed',
     'tagged_post_booking_completed'
   )
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **Verify events were tracked:**
   - Should see `booking_from_tagged_post` when you opened booking screen
   - Should see `booking_completed` when you completed booking
   - Should see `tagged_post_booking_completed` when you completed booking from tagged post

4. **Check event properties:**
   - `booking_from_tagged_post` should include:
     - portfolio_item_id
     - provider_id
     - service_id
     - service_name
   
   - `tagged_post_booking_completed` should include:
     - booking_id
     - portfolio_item_id
     - provider_id
     - service_id
     - service_name
     - total_price

### **Expected Results:**
- ✅ All three analytics events are present
- ✅ Event properties contain correct data
- ✅ Timestamps are accurate
- ✅ User IDs are correct

---

## 📋 Test 5: Regular Booking (Control Test)

### **As Customer:**

1. **Navigate to a provider profile directly**
   - Use Search or Browse
   - Tap on a provider card

2. **Tap "Book Now" button**
   - Should navigate to booking screen

3. **Verify booking screen state**
   - NO service should be pre-selected
   - NO "From Post" badge should appear
   - Service cards should have normal styling

4. **Select a service manually**
   - Tap on a service card
   - Should select normally

5. **Complete booking**
   - Follow normal booking flow

6. **Check analytics**
   - Should see `booking_completed` event
   - Should NOT see `booking_from_tagged_post` event
   - Should NOT see `tagged_post_booking_completed` event
   - `from_tagged_post` property should be `false`

### **Expected Results:**
- ✅ No pre-selection occurs
- ✅ No "From Post" badge
- ✅ Normal service card styling
- ✅ Booking completes normally
- ✅ Analytics don't include tagged post events

---

## 🐛 Common Issues & Solutions

### **Issue 1: Upload modal doesn't appear**
**Solution:** Check console logs for errors. Verify `fetchProviderServices()` is loading services correctly.

### **Issue 2: Services list is empty**
**Solution:** Make sure provider has active services. Go to Services screen and add services first.

### **Issue 3: "Bookable" badge doesn't show**
**Solution:** Verify `provider_service_id` is saved in database. Check feed query includes service information.

### **Issue 4: Service not pre-selected**
**Solution:** Check navigation parameters include `serviceId`. Verify `preSelectedServiceId` is being read correctly.

### **Issue 5: Analytics events not tracked**
**Solution:** Check `analytics_events` table exists. Verify analytics service is initialized. Check console for errors.

---

## 📊 Next Steps After Testing

Once testing is complete:

1. **Review analytics data** - Check what insights you can gather
2. **Build analytics dashboard** - Visualize the metrics
3. **Optimize UI/UX** - Based on user feedback
4. **Add more features** - Like post performance insights for providers

---

## 💡 Tips for Testing

- **Use real images** - Makes the experience more realistic
- **Test on actual device** - Better than simulator for image selection
- **Test with multiple services** - Verify tagging works for all service types
- **Test edge cases** - Skip all images, tag all images, mix of both
- **Check performance** - Upload should be smooth even with multiple images

---

## 📱 Quick Commands

**Reload app:** Press `r` in terminal
**Open debugger:** Press `j` in terminal
**Clear cache:** Press `shift+c` in terminal

---

## ✅ Testing Checklist

- [ ] Provider can upload images with service tags
- [ ] Upload modal shows smooth multi-step flow
- [ ] Progress indicator works correctly
- [ ] Service selection works
- [ ] Images upload successfully
- [ ] "Bookable" badge shows in feed
- [ ] Service info displays correctly
- [ ] Booking screen pre-selects service
- [ ] "From Post" badge displays
- [ ] Special styling applied to pre-selected service
- [ ] Booking completes successfully
- [ ] Analytics events tracked correctly
- [ ] Regular booking works without tagged post features

---

**Ready to test!** Open the app on your device and follow the test flows above. Let me know if you encounter any issues! 🚀

