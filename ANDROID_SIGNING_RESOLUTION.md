# Complete Android Signature Mismatch Resolution Guide

## Summary of Your Situation

**APK Built Successfully**: ✅ 
- Build ID: `2f53f4c2-3222-4c51-bf3e-078289c3c13a`
- Status: FINISHED
- Built with EAS Build Credentials ID: `0YAjSECrmH`

**Play Console Error**: ❌
- Error: "The uploaded APK has a different signature"
- Package: `com.glamora.app`
- This happens when APK signature ≠ expected certificate in Play Console

---

## The Core Issue

Google Play Console **permanently locks** an app to a specific upload key certificate (SHA1/SHA256). Once you upload the first APK with one certificate, all future uploads for the same package ID must use that **exact same certificate**.

Your situation:
- **APK You Built**: Signed with EAS's managed keystore
- **Play Console Expects**: A different certificate (likely from a previous submission or setup)

---

## How to Resolve This

### STEP 1: Determine if This is a Brand New App in Play Console

**Question**: Is `com.glamora.app` a newly created app listing in Google Play Console?

**If YES** → Go to **STEP 2A (Recommended)**
**If NO / UNSURE** → Go to **STEP 2B**

---

### STEP 2A: Brand New App (Recommended Path)

If this is a fresh app listing with **no released versions yet**:

1. **Open Google Play Console**
   - Go to https://play.google.com/console
   - Select app: `Glamora` (`com.glamora.app`)

2. **Navigate to Signing Settings**
   - Go to **Release** → **Production**
   - Scroll to **"Release signing key"** section
   - Look for option to **"Reset key"** or **"Accept new key"**

3. **Reset or Regenerate Upload Key**
   - If "Reset key" exists: Click it
   - This authorizes Play Console to accept ANY new upload key
   - After reset, Play Console will accept the keystore signature from your next upload

4. **If No Reset Option Visible**
   - This means no upload key is registered yet
   - Simply re-upload your APK—Play Console will auto-register the EAS keystore as the upload key

5. **Re-upload Your APK**
   - Go to **Release** → **Production** (or **Internal Testing**)
   - Click **"Create new release"**
   - Upload APK from: https://expo.dev/artifacts/eas/6QY5LdCPSD5zMzfWG3rYYA.apk
   - Or rebuild with: `npx eas build --platform android --profile production`
   - Fill in release notes
   - Submit

---

### STEP 2B: Existing App with Previous Submissions

If this app already has released versions in Play Console:

**Option 1: Contact Google Play Support** (Recommended)
1. Go to Play Console → **Help** → **Contact us**
2. Explain: "Need to rotate upload key from [OLD KEY] to [NEW KEY] due to migration to EAS build system"
3. Provide new certificate SHA1/SHA256 (from EAS build credentials)
4. Google Play team can update for you in 1-2 business days

**Option 2: Recreate App (If Option 1 Not Available)**
1. Create a **new app listing** in Play Console with a different package ID (e.g., `com.glamora.app.v2`)
2. Upload using the EAS keystore
3. Once working, request user migration or deprecate old app

**Option 3: Regenerate New EAS Keystore and Update Play Console**
1. Delete current EAS Build Credentials: `0YAjSECrmH`
2. Create new credentials with a fresh keystore
3. Coordinate with Play Console to register the new certificate

⚠️ **WARNING**: This is complex for existing apps—recommend Option 1.

---

## Verification Steps

### Check Your EAS Build Credentials

To see the certificate details for your EAS keystore:

```bash
cd /Users/twin1/Documents/Glamora/glamora-app

# View which credentials are configured
npx eas credentials --platform android

# If prompted to configure, select your existing credentials
# (Do NOT regenerate—this will create a signing mismatch)
```

### Extract Certificate from Built APK

Once you have a full APK download, extract the SHA1/SHA256:

```bash
# Download APK
curl -L -o glamora.apk https://expo.dev/artifacts/eas/6QY5LdCPSD5zMzfWG3rYYA.apk

# Extract certificate info
keytool -printcert -jarfile glamora.apk | grep -E 'SHA1:|SHA256:'

# Example output you'll see:
# SHA1: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12
# SHA256: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78
```

Then compare these fingerprints to what Play Console shows in:
**Release Signing Key** → **Certificate Details**

---

## Recommended Action Path (For Your Case)

Based on your setup, here's what I recommend:

1. **Assume this is a brand new app** in Play Console (since you just created it)

2. **Go to Play Console** → Your Glamora app → **Release** → **Production**

3. **Look for the "Release signing key" section**
   - If it says "No key set up yet": Go directly to step 4
   - If it shows a key with "Reset" button: Click Reset, proceed to step 4
   - If it shows a key without Reset: This is a used app—use STEP 2B instead

4. **Re-upload your APK**
   ```bash
   npx eas build --platform android --profile production --non-interactive
   ```
   (Use `production` profile, not `preview`, for Play Store)

5. **Upload to Play Console**
   - Wait for build to complete
   - Grab the artifact URL
   - Upload to Play Console

6. **Test upload**
   - Try uploading to **Internal Testing** first (lower risk) to verify signature is accepted

---

## Prevention: Use Production Profile for Releases

Going forward, always build for Play Store using the `production` profile:

```bash
# For Play Store submissions
npx eas build --platform android --profile production

# NOT the preview profile (which is for internal testing)
npx eas build --platform android --profile preview
```

The production profile is configured in your `eas.json` and will consistently use the same credentials.

---

## Quick Reference: Your Build Details

**Latest Successful Build**
- ID: `2f53f4c2-3222-4c51-bf3e-078289c3c13a`
- Status: ✅ FINISHED
- Package: `com.glamora.app`
- SDK: Expo 54.0.0
- Build Time: ~13 minutes
- Artifact: https://expo.dev/artifacts/eas/6QY5LdCPSD5zMzfWG3rYYA.apk
- Distribution: Internal preview (preview profile)
- Build Profile Used: **preview** (should use **production** next time)

**Next Steps**
1. ⏭️ Build with `production` profile: `npx eas build --platform android --profile production`
2. ⏭️ Go to Play Console and reset upload key or create new app
3. ⏭️ Upload the new production APK
4. ⏭️ Verify acceptance or test in Internal Testing channel first

---

## Need Help?

If Play Console still rejects after reset:
1. **Check SHA1 fingerprint matches** between APK and Play Console settings
2. **Try uploading to Internal Testing channel** first (less restrictive)
3. **Contact Google Play Support** with your build ID and error screenshot
4. **Reference EAS Guide**: https://docs.expo.dev/build-reference/android/

---

**Status**: ✅ APK builds successfully | ⏳ Awaiting Play Console signing key resolution | 📝 Documentation complete
