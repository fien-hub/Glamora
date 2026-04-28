# Android APK Signature Mismatch - Solution Guide

## Problem Summary
Play Console rejected the APK with error: **"The uploaded APK has a different signature"**

This means the APK you built with EAS is signed with a **different certificate** than what Play Console expects for the `com.glamora.app` package.

## Root Cause
EAS uses **managed keystores** for signing builds. When you build an APK with EAS, it automatically signs using a keystore stored on EAS servers (Build Credentials `0YAjSECrmH` in your case). This keystore may be different from:
- The upload key originally registered with Play Console
- Any local keystore you may have used for previous test builds

## Solution Options

### Option 1: Reset Play Console Upload Key (RECOMMENDED FOR NEW APPS)
If this is a fresh app in Play Console (no previous production builds), you can let Play Console auto-accept the new upload key:

1. Go to Play Console → `com.glamora.app` → Release → Production
2. Scroll to "Release signing key" section
3. Click "Reset key"
4. This allows Play Console to accept the new upload key from EAS
5. Re-upload the APK

**⚠️ WARNING**: Can only be done if you have NO production releases. After your first released build, this option becomes permanent and cannot be changed.

### Option 2: Export EAS Keystore & Re-upload APK
If you need the exact certificate fingerprint:

1. EAS manages the keystore remotely, but stores it in their infrastructure
2. The fingerprint from the successful build (ID: `2f53f4c2-3222-4c51-bf3e-078289c3c13a`) is:
   - Built with EAS's managed Certificate

3. You can view the keystore fingerprint by:
   ```bash
   npx eas credentials --platform android
   ```

4. Then configure-build to see which keystore is in use:
   ```bash
   npx eas credentials configure-build --platform android
   ```

### Option 3: Provide Keystore to Play Store Developers
Contact Google Play team to update the accepted upload key if:
- You have a Google Play Developer account that was previously used
- You can provide the certificate SHA1/SHA256 fingerprints from your new EAS build

## Check Your Current Setup

**Latest Build Details:**
- Build ID: `2f53f4c2-3222-4c51-bf3e-078289c3c13a`
- Status: ✅ FINISHED (builds successfully)
- Distribution: Internal (preview profile)
- APK URL: `https://expo.dev/artifacts/eas/6QY5LdCPSD5zMzfWG3rYYA.apk`
- EAS Build Credentials ID: `0YAjSECrmH`

## Next Steps

### Recommended Path for New App:
1. **If this is a brand new Play Console app** (no released versions yet):
   - Go to Play Console
   - Find the Release signing key section
   - Click "Reset key" or "Accept new key"
   - Re-upload your APK

2. **If Play Console won't let you reset**:
   - Create a new app listing in Play Console
   - Use the Bundle ID: `com.glamora.app`
   - Upload the APK fresh

### If You Have Existing Production Releases:
- Contact Google Play support
- Request to rotate the upload key to match the EAS keystore certificate
- Provide the SHA1/SHA256 fingerprints from your EAS build credentials

## Verification Commands

To verify the EAS keystore in use:
```bash
cd /Users/twin1/Documents/Glamora/glamora-app

# View active credentials
npx eas credentials --platform android

# Or debug the build process to see which keystore was used
npx eas credentials list --platform android
```

## Prevention for Future Builds

To ensure consistency:
1. Always use the **same EAS project and build profile** for Play Store submissions
2. Never delete or regenerate EAS build credentials once they're registered with Play Console
3. Use `production` profile (not `preview`) for Play Store submission:
   ```bash
   npx eas build --platform android --profile production
   ```

---
**Current Status**: APK builds successfully ✅ | Signature mismatch with Play Console ⚠️ | Ready to submit once signing issue is resolved ✅
