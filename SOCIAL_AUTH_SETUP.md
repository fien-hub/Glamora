# Social Authentication Setup Guide

This guide explains how to configure Google and Apple Sign-In for the Glamora app.

## Table of Contents
- [Google Sign-In Setup](#google-sign-in-setup)
- [Apple Sign-In Setup](#apple-sign-in-setup)
- [Supabase Configuration](#supabase-configuration)
- [Testing](#testing)

---

## Google Sign-In Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sign-In API**

### 2. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: Glamora
   - User support email: your email
   - Developer contact: your email
4. Create credentials for each platform:

#### Web Client ID (Required for both iOS and Android)
- Application type: **Web application**
- Name: Glamora Web Client
- Authorized redirect URIs: Add your Supabase callback URL
  - Format: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
- Copy the **Client ID** - this is your `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

#### iOS Client ID (Required for iOS)
- Application type: **iOS**
- Name: Glamora iOS
- Bundle ID: `com.glamora.app` (must match your app.json)
- Copy the **Client ID** - this is your `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

#### Android Client ID (Required for Android)
- Application type: **Android**
- Name: Glamora Android
- Package name: `com.glamora.app` (must match your app.json)
- SHA-1 certificate fingerprint: Get this by running:
  ```bash
  # For debug builds
  keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey
  # Password: android
  
  # For release builds
  keytool -keystore /path/to/your/release.keystore -list -v
  ```

### 3. Add Environment Variables

Add to your `.env` file:
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id_here.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id_here.apps.googleusercontent.com
```

---

## Apple Sign-In Setup

### 1. Apple Developer Account Requirements

- You need an active **Apple Developer Program** membership ($99/year)
- Apple Sign-In only works on physical iOS devices (not simulators)

### 2. Configure App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** > **App IDs**
4. Find or create your app ID: `com.glamora.app`
5. Enable **Sign in with Apple** capability
6. Click **Edit** and configure:
   - Enable as a primary App ID
   - Save changes

### 3. Configure Xcode Project (iOS only)

When building for iOS:
1. Open your project in Xcode
2. Select your target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **Sign in with Apple**

### 4. No Environment Variables Needed

Apple Sign-In is automatically configured through your bundle identifier. No additional environment variables are required.

---

## Supabase Configuration

### 1. Enable OAuth Providers in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**

### 2. Configure Google Provider

1. Find **Google** in the providers list
2. Enable it
3. Add your credentials:
   - **Client ID**: Your Web Client ID from Google Cloud Console
   - **Client Secret**: Your Web Client Secret from Google Cloud Console
4. Add authorized redirect URLs:
   - `com.glamora.app://` (for mobile deep linking)
   - `glamora://` (your app scheme)
5. Save changes

### 3. Configure Apple Provider

1. Find **Apple** in the providers list
2. Enable it
3. Configure Apple credentials:
   - **Services ID**: Create one in Apple Developer Portal
   - **Team ID**: Found in Apple Developer Portal
   - **Key ID**: From your Apple Sign-In key
   - **Private Key**: Download from Apple Developer Portal
4. Add authorized redirect URLs:
   - `com.glamora.app://` (for mobile deep linking)
   - `glamora://` (your app scheme)
5. Save changes

### 4. Update Database Triggers

The social auth implementation automatically creates user records when users sign in with Google or Apple. The following happens automatically:

1. User signs in with Google/Apple
2. Supabase creates an auth user
3. Our app creates:
   - A record in the `users` table
   - A record in the `profiles` table
   - A role-specific profile (customer or provider)

---

## Testing

### Testing Google Sign-In

#### iOS Simulator
- Google Sign-In may not work properly in iOS Simulator
- Test on a physical device for best results

#### Android Emulator
- Make sure you have Google Play Services installed
- Use an emulator with Google APIs

#### Physical Devices
1. Build and install the app on your device
2. Tap "Continue with Google"
3. Select your Google account
4. Grant permissions
5. You should be signed in automatically

### Testing Apple Sign-In

#### iOS Simulator
- Apple Sign-In does NOT work in iOS Simulator
- You must test on a physical iOS device

#### Physical iOS Device
1. Make sure you're signed in to iCloud on your device
2. Build and install the app on your device
3. Tap "Continue with Apple"
4. Choose to share or hide your email
5. Authenticate with Face ID/Touch ID
6. You should be signed in automatically

### Troubleshooting

#### Google Sign-In Issues

**Error: "DEVELOPER_ERROR"**
- Check that your SHA-1 certificate fingerprint is correct
- Verify your package name matches exactly
- Make sure you're using the correct Client IDs

**Error: "SIGN_IN_CANCELLED"**
- User cancelled the sign-in flow
- This is normal behavior

**Error: "PLAY_SERVICES_NOT_AVAILABLE"**
- Install Google Play Services on your emulator
- Use a device with Google Play Services

#### Apple Sign-In Issues

**Button doesn't appear**
- Check that you're running on iOS
- Verify Apple Auth is available with `isAppleAuthAvailable()`

**Error: "ERR_CANCELED"**
- User cancelled the sign-in flow
- This is normal behavior

**Sign-in fails silently**
- Check your bundle identifier matches exactly
- Verify Sign in with Apple is enabled in Apple Developer Portal
- Make sure you're testing on a physical device

---

## Security Best Practices

1. **Never commit credentials**: Keep your `.env` file in `.gitignore`
2. **Use different credentials for dev/prod**: Create separate OAuth clients for development and production
3. **Rotate secrets regularly**: Update your OAuth secrets periodically
4. **Monitor usage**: Check Google Cloud Console and Apple Developer Portal for unusual activity
5. **Implement rate limiting**: Prevent abuse of your authentication endpoints

---

## Additional Resources

- [Google Sign-In Documentation](https://developers.google.com/identity/sign-in/ios/start-integrating)
- [Apple Sign-In Documentation](https://developer.apple.com/documentation/sign_in_with_apple)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Verify all configuration steps were completed
4. Test on a physical device (especially for Apple Sign-In)
5. Check that your OAuth credentials are correct in Supabase

