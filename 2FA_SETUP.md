# Two-Factor Authentication (2FA) Setup Guide

## Overview

Glamora now supports **Two-Factor Authentication (2FA)** and **Biometric Authentication** (Face ID, Touch ID, Fingerprint) to provide enhanced security for user accounts.

---

## Features Implemented

### 1. **Two-Factor Authentication (2FA)**
- **Email OTP**: Users can receive verification codes via email
- **SMS OTP**: Users can receive verification codes via SMS
- **6-digit codes**: Time-limited verification codes
- **Resend functionality**: Users can request new codes with cooldown timer
- **Method switching**: Users can change between email and SMS verification

### 2. **Biometric Authentication**
- **Face ID** (iOS devices with Face ID)
- **Touch ID** (iOS devices with Touch ID)
- **Fingerprint** (Android devices with fingerprint sensors)
- **Automatic detection**: App detects available biometric type
- **Fallback to passcode**: If biometric fails, users can use device passcode

### 3. **Security Settings Screen**
- Enable/disable 2FA
- Choose 2FA method (Email or SMS)
- Enable/disable biometric authentication
- Security tips and best practices
- Accessible from both customer and provider profiles

---

## Implementation Details

### **Files Created**

1. **`glamora-app/src/utils/biometricAuth.ts`**
   - Biometric authentication utility functions
   - Device capability detection
   - Security level checking

2. **`glamora-app/src/utils/twoFactorAuth.ts`**
   - 2FA management functions
   - OTP sending and verification
   - Settings persistence with AsyncStorage

3. **`glamora-app/src/screens/SecuritySettingsScreen.tsx`**
   - Main security settings interface
   - Toggle switches for 2FA and biometric
   - Security tips section

4. **`glamora-app/src/screens/auth/TwoFactorVerificationScreen.tsx`**
   - OTP code entry screen
   - Countdown timer for resend
   - Masked identifier display

### **Files Modified**

1. **`glamora-app/src/screens/auth/LoginScreen.tsx`**
   - Added 2FA check after successful login
   - Added biometric login button
   - Navigation to 2FA verification screen

2. **`glamora-app/src/screens/customer/ProfileScreen.tsx`**
   - Added "Security Settings" button

3. **`glamora-app/src/screens/provider/ProfileScreen.tsx`**
   - Added "Security Settings" button

4. **`glamora-app/src/navigation/index.tsx`**
   - Added TwoFactorVerification screen to auth stack
   - Added SecuritySettings screen to customer and provider stacks

5. **`glamora-app/app.json`**
   - Added expo-local-authentication plugin
   - Added Face ID permission message

---

## How It Works

### **2FA Flow**

1. **Enable 2FA**:
   - User navigates to Security Settings
   - Toggles "Enable 2FA" switch
   - Selects verification method (Email or SMS)
   - Settings saved to AsyncStorage

2. **Login with 2FA**:
   - User enters email and password
   - If 2FA is enabled, redirected to verification screen
   - Verification code sent automatically
   - User enters 6-digit code
   - Code verified with Supabase
   - User logged in successfully

3. **Disable 2FA**:
   - User navigates to Security Settings
   - Toggles "Enable 2FA" switch off
   - Confirmation dialog shown
   - Settings removed from AsyncStorage

### **Biometric Authentication Flow**

1. **Enable Biometric**:
   - User navigates to Security Settings
   - Toggles biometric switch on
   - Biometric authentication prompt shown
   - If successful, setting saved to AsyncStorage

2. **Login with Biometric**:
   - User sees biometric login button on login screen
   - Taps button
   - Biometric prompt shown (Face ID/Touch ID/Fingerprint)
   - If successful, user logged in
   - *Note: Currently shows info message; full implementation requires secure credential storage*

3. **Disable Biometric**:
   - User navigates to Security Settings
   - Toggles biometric switch off
   - Confirmation dialog shown
   - Setting removed from AsyncStorage

---

## Supabase Integration

### **OTP Functionality**

Glamora uses Supabase's built-in OTP functionality:

**Email OTP:**
```typescript
await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false,
  },
});
```

**SMS OTP:**
```typescript
await supabase.auth.signInWithOtp({
  phone,
  options: {
    shouldCreateUser: false,
  },
});
```

**Verification:**
```typescript
await supabase.auth.verifyOtp({
  email: identifier,
  token: code,
  type: 'email',
});
```

### **Supabase Configuration Required**

For SMS OTP to work, you need to configure an SMS provider in Supabase:

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Phone" provider
3. Configure SMS provider (Twilio, MessageBird, Vonage, etc.)
4. Add provider credentials

---

## Testing Instructions

### **Testing 2FA (Email)**

1. **Enable 2FA:**
   - Log in to the app
   - Navigate to Profile → Security Settings
   - Toggle "Enable 2FA" on
   - Select "Email" method
   - Verify success message

2. **Test Login:**
   - Sign out
   - Sign in with email/password
   - Should be redirected to verification screen
   - Check email for 6-digit code
   - Enter code
   - Should be logged in successfully

3. **Test Resend:**
   - During verification, wait for countdown
   - Tap "Resend code"
   - Check email for new code

### **Testing 2FA (SMS)**

*Note: Requires Supabase SMS provider configuration*

1. **Enable 2FA:**
   - Navigate to Security Settings
   - Toggle "Enable 2FA" on
   - Select "SMS" method
   - Verify success message

2. **Test Login:**
   - Sign out
   - Sign in with email/password
   - Should be redirected to verification screen
   - Check phone for SMS with 6-digit code
   - Enter code
   - Should be logged in successfully

### **Testing Biometric Authentication**

**iOS (Face ID/Touch ID):**
1. **Enable Biometric:**
   - Navigate to Security Settings
   - Toggle biometric switch on
   - Face ID/Touch ID prompt should appear
   - Authenticate
   - Verify success message

2. **Test Login:**
   - Sign out
   - On login screen, tap "Sign in with Face ID/Touch ID" button
   - Biometric prompt should appear
   - Authenticate
   - *Currently shows info message*

**Android (Fingerprint):**
1. **Enable Biometric:**
   - Navigate to Security Settings
   - Toggle biometric switch on
   - Fingerprint prompt should appear
   - Authenticate
   - Verify success message

2. **Test Login:**
   - Sign out
   - On login screen, tap "Sign in with Fingerprint" button
   - Fingerprint prompt should appear
   - Authenticate
   - *Currently shows info message*

**Simulator/Emulator Testing:**
- iOS Simulator: Face ID can be simulated (Features → Face ID → Enrolled)
- Android Emulator: Fingerprint can be simulated via ADB commands
- Apple Sign-In does NOT work in iOS Simulator (requires physical device)

---

## Security Considerations

### **Best Practices Implemented**

1. **Secure Storage**: 2FA settings stored in AsyncStorage (local device only)
2. **OTP Expiry**: Supabase OTP codes expire after a set time
3. **Rate Limiting**: Resend cooldown prevents spam
4. **Confirmation Dialogs**: Disabling security features requires confirmation
5. **Masked Identifiers**: Email/phone partially hidden in UI

### **Future Enhancements**

1. **Secure Credential Storage**: Use Expo SecureStore for biometric login credentials
2. **Backup Codes**: Generate backup codes for account recovery
3. **Session Management**: Automatic logout after inactivity
4. **Device Trust**: Remember trusted devices
5. **Security Logs**: Track authentication attempts

---

## Troubleshooting

### **2FA Not Working**

**Email OTP not received:**
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email provider configuration
- Check Supabase logs for errors

**SMS OTP not received:**
- Verify phone number format (include country code)
- Check Supabase SMS provider configuration
- Verify SMS provider credits/balance
- Check Supabase logs for errors

### **Biometric Not Available**

**"Biometric authentication is not available":**
- Device doesn't have biometric hardware
- Biometric not enrolled (no Face ID/Touch ID/Fingerprint set up)
- Device doesn't have passcode/PIN set up
- Check device settings

**Biometric authentication fails:**
- Try again with better lighting (Face ID)
- Clean fingerprint sensor (Touch ID/Fingerprint)
- Re-enroll biometric in device settings
- Use passcode fallback

### **Common Errors**

**"Invalid verification code":**
- Code may have expired (request new code)
- Code entered incorrectly (check carefully)
- Using old code (use most recent code)

**"Failed to send verification code":**
- Network connection issue
- Supabase provider not configured
- Email/phone number invalid

---

## API Reference

### **Biometric Auth Functions**

```typescript
// Check if biometric is available
const available = await isBiometricAvailable();

// Get biometric type
const type = await getBiometricType(); // "Face ID", "Touch ID", "Fingerprint"

// Authenticate
const result = await authenticateWithBiometrics({
  promptMessage: 'Authenticate to continue',
  cancelLabel: 'Cancel',
});
```

### **2FA Functions**

```typescript
// Check if 2FA is enabled
const enabled = await isTwoFactorEnabled();

// Get 2FA method
const method = await getTwoFactorMethod(); // 'email', 'sms', or 'none'

// Enable 2FA
await enableTwoFactor('email'); // or 'sms'

// Disable 2FA
await disableTwoFactor();

// Send verification code
await sendEmailVerificationCode(email);
await sendSMSVerificationCode(phone);

// Verify code
await verifyOTPCode(identifier, code, type);
```

---

## Next Steps

1. **Configure Supabase SMS Provider** (for SMS OTP)
2. **Implement Secure Credential Storage** (for biometric login)
3. **Add Backup Codes** (for account recovery)
4. **Test on Physical Devices** (especially for biometric)
5. **Monitor Security Logs** (track authentication attempts)

---

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs/guides/auth
- Check Expo documentation: https://docs.expo.dev/versions/latest/sdk/local-authentication/
- Review implementation in `glamora-app/src/utils/` directory

