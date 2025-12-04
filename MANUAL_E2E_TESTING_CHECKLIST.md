# 📱 Manual E2E Testing Checklist (Expo Go)

Since we're using Expo Go instead of simulators, use this checklist to manually test all E2E flows on your phone.

---

## ✅ **Testing Instructions**

- Test each flow in order
- Check off items as you complete them
- Note any bugs or issues you find
- Take screenshots of any errors

---

## 🔐 **Flow 1: Authentication (8 Tests)**

### **Test 1.1: App Launch & Onboarding**
- [ ] Open the app in Expo Go
- [ ] See splash screen
- [ ] See onboarding screens (if first time)
- [ ] Can skip onboarding
- [ ] Reach Welcome screen

### **Test 1.2: Customer Sign Up**
- [ ] Tap "Get Started" or "Create Account"
- [ ] Select "Customer" role
- [ ] Fill in first name
- [ ] Fill in last name
- [ ] Fill in email (use a new email)
- [ ] Fill in phone number
- [ ] Fill in password (8+ characters)
- [ ] Confirm password
- [ ] Tap "Create Account"
- [ ] See success message or navigate to personalization

### **Test 1.3: Email Sign In**
- [ ] Sign out if logged in
- [ ] Go to Login screen
- [ ] Enter email
- [ ] Enter password
- [ ] Tap "Sign In"
- [ ] Successfully logged in
- [ ] See home screen

### **Test 1.4: Sign Out**
- [ ] Go to Profile/Settings
- [ ] Tap "Sign Out"
- [ ] Confirm sign out
- [ ] Return to Welcome/Login screen

### **Test 1.5: Password Reset**
- [ ] Go to Login screen
- [ ] Tap "Forgot Password?"
- [ ] Enter email
- [ ] Tap "Send Reset Link"
- [ ] See success message
- [ ] Check email for reset link (optional)

### **Test 1.6: Apple Sign-In (iOS Only)**
- [ ] Go to Login/Signup screen
- [ ] See "Continue with Apple" button
- [ ] Tap button
- [ ] Complete Apple authentication
- [ ] Successfully logged in

### **Test 1.7: Google Sign-In (Not Available in Expo Go)**
- [ ] Go to Login/Signup screen
- [ ] Google Sign-In button should be HIDDEN
- [ ] This is expected behavior in Expo Go ✅

### **Test 1.8: Session Persistence**
- [ ] Log in to the app
- [ ] Close the app completely
- [ ] Reopen the app
- [ ] Should still be logged in
- [ ] See home screen without login prompt

---

## 📅 **Flow 2: Booking (12 Tests)**

### **Test 2.1: Browse Services**
- [ ] Log in as customer
- [ ] See home screen with service categories
- [ ] Tap on a category (e.g., "Hair Styling")
- [ ] See list of services
- [ ] Services display correctly with images and prices

### **Test 2.2: Select Provider**
- [ ] Tap on a service
- [ ] See list of available providers
- [ ] Providers show ratings and reviews
- [ ] Tap on a provider
- [ ] See provider details (bio, portfolio, reviews)

### **Test 2.3: Choose Date & Time**
- [ ] Tap "Book Now" on provider profile
- [ ] See booking modal
- [ ] Select a date from calendar
- [ ] See available time slots
- [ ] Select a time slot
- [ ] Time slot is highlighted

### **Test 2.4: Enter Address**
- [ ] Enter street address
- [ ] Enter city
- [ ] Enter state/province
- [ ] Enter zip/postal code
- [ ] Address is saved
- [ ] Can proceed to payment

### **Test 2.5: Payment Processing**
- [ ] See payment screen
- [ ] Enter test card: 4242 4242 4242 4242
- [ ] Enter expiry: 12/34
- [ ] Enter CVC: 123
- [ ] Tap "Pay Now"
- [ ] See processing indicator
- [ ] Payment succeeds

### **Test 2.6: Booking Confirmation**
- [ ] See booking confirmation screen
- [ ] Booking details are correct (date, time, service, provider)
- [ ] See booking ID
- [ ] Can view booking in "My Bookings"

### **Test 2.7: View Bookings**
- [ ] Go to "Bookings" tab
- [ ] See list of all bookings
- [ ] Bookings show correct status (upcoming, completed, cancelled)
- [ ] Can tap on a booking to see details

### **Test 2.8: Cancel Booking**
- [ ] Go to "Bookings" tab
- [ ] Tap on an upcoming booking
- [ ] Tap "Cancel Booking"
- [ ] Confirm cancellation
- [ ] Booking status changes to "Cancelled"
- [ ] See refund message (if applicable)

### **Test 2.9: Recurring Bookings**
- [ ] Start a new booking
- [ ] Toggle "Recurring Booking" switch
- [ ] Select frequency (weekly, bi-weekly, monthly)
- [ ] Select end date or number of occurrences
- [ ] Complete booking
- [ ] See multiple bookings created

### **Test 2.10: Booking History**
- [ ] Go to "Bookings" tab
- [ ] Switch to "Past" bookings
- [ ] See completed bookings
- [ ] Can view details of past bookings

### **Test 2.11: Booking Notifications**
- [ ] Create a booking
- [ ] Check for confirmation notification
- [ ] Check for reminder notification (if time permits)

### **Test 2.12: Calendar Sync**
- [ ] Create a booking
- [ ] Check if booking appears in device calendar (if enabled)
- [ ] Booking has correct date, time, and details

---

## 👤 **Flow 3: Provider Features (9 Tests)**

**Note:** You need to create a provider account to test these features.

### **Test 3.1: Provider Sign Up**
- [ ] Sign out
- [ ] Create new account
- [ ] Select "Provider" role
- [ ] Fill in all required fields
- [ ] Complete sign up
- [ ] See provider dashboard

### **Test 3.2: View Provider Bookings**
- [ ] Log in as provider
- [ ] Go to "Bookings" tab
- [ ] See list of customer bookings
- [ ] Bookings show customer name, service, date, time

### **Test 3.3: Accept Booking**
- [ ] See a pending booking
- [ ] Tap on booking
- [ ] Tap "Accept"
- [ ] Booking status changes to "Confirmed"
- [ ] Customer receives notification

### **Test 3.4: Decline Booking**
- [ ] See a pending booking
- [ ] Tap on booking
- [ ] Tap "Decline"
- [ ] Enter reason (optional)
- [ ] Booking status changes to "Declined"

### **Test 3.5: Complete Booking**
- [ ] See a confirmed booking (past date/time)
- [ ] Tap on booking
- [ ] Tap "Mark as Complete"
- [ ] Booking status changes to "Completed"
- [ ] Earnings are updated

### **Test 3.6: Update Availability**
- [ ] Go to "Schedule" or "Availability" tab
- [ ] See calendar with available/unavailable dates
- [ ] Toggle availability for specific dates
- [ ] Set working hours
- [ ] Save changes

### **Test 3.7: Set Time Off**
- [ ] Go to "Schedule" tab
- [ ] Tap "Add Time Off"
- [ ] Select start date
- [ ] Select end date
- [ ] Enter reason (optional)
- [ ] Save time off
- [ ] Dates are blocked from bookings

### **Test 3.8: View Earnings**
- [ ] Go to "Earnings" or "Dashboard" tab
- [ ] See total earnings
- [ ] See earnings breakdown (by service, by date)
- [ ] See pending payouts
- [ ] See completed payouts

### **Test 3.9: Update Provider Profile**
- [ ] Go to Profile/Settings
- [ ] Update bio
- [ ] Update profile photo
- [ ] Update services offered
- [ ] Update pricing
- [ ] Save changes
- [ ] Changes are reflected in provider listing

---

## 🔍 **Flow 4: Search & Discovery (8 Tests)**

### **Test 4.1: Search by Service**
- [ ] Go to home screen
- [ ] Tap search bar
- [ ] Type service name (e.g., "haircut")
- [ ] See search results
- [ ] Results match search query

### **Test 4.2: Search by Location**
- [ ] Tap search bar
- [ ] Enter location or zip code
- [ ] See providers in that area
- [ ] Results are sorted by distance

### **Test 4.3: Filter by Price**
- [ ] View service providers
- [ ] Tap "Filters"
- [ ] Set price range (min/max)
- [ ] Apply filter
- [ ] Only providers within price range are shown

### **Test 4.4: Filter by Rating**
- [ ] Tap "Filters"
- [ ] Select minimum rating (e.g., 4+ stars)
- [ ] Apply filter
- [ ] Only providers with rating >= selected are shown

### **Test 4.5: Filter by Availability**
- [ ] Tap "Filters"
- [ ] Select "Available Today" or specific date
- [ ] Apply filter
- [ ] Only available providers are shown

### **Test 4.6: Sort Results**
- [ ] View search results
- [ ] Tap "Sort"
- [ ] Select sort option (price, rating, distance)
- [ ] Results are reordered correctly

### **Test 4.7: View Provider Details**
- [ ] Tap on a provider from search results
- [ ] See full provider profile
- [ ] See services, pricing, reviews, portfolio
- [ ] Can navigate back to search results

### **Test 4.8: Save Favorites**
- [ ] View a provider profile
- [ ] Tap "Favorite" or heart icon
- [ ] Provider is added to favorites
- [ ] Go to "Favorites" tab
- [ ] See saved provider
- [ ] Can unfavorite

---

## 📊 **Testing Summary**

After completing all tests, fill out this summary:

### **Total Tests:** 37
### **Tests Passed:** _____ / 37
### **Tests Failed:** _____ / 37
### **Tests Skipped:** _____ / 37 (e.g., Google Sign-In)

### **Critical Issues Found:**
1. 
2. 
3. 

### **Minor Issues Found:**
1. 
2. 
3. 

### **Notes:**
- 
- 
- 

---

## 🎯 **Next Steps After Testing**

1. **Document all issues** found during testing
2. **Take screenshots** of any errors or bugs
3. **Share results** with the development team
4. **Prioritize fixes** based on severity
5. **Retest** after fixes are applied

---

**Testing Date:** _______________
**Tester Name:** _______________
**Device:** _______________
**OS Version:** _______________
**Expo Go Version:** _______________

