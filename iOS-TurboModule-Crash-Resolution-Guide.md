# iOS TurboModule Crash Resolution Guide

## A field guide from 53+ failed iOS builds to a stable React Native 0.81 + Expo SDK 54 app

**Project**: Brain Glow (Expo React Native, iOS)
**Date Resolved**: February 2026
**React Native Version**: 0.81
**Expo SDK**: 54.0.33
**Target**: iOS 16.6+

---

## The Problem in One Sentence

React Native 0.81's TurboModule system has a known bug where async void native method calls throw C++ exceptions on a background queue that nothing catches, causing an immediate `abort()` crash on app startup.

---

## Who Should Read This

- Anyone using **React Native 0.81** with **New Architecture enabled**
- Anyone seeing `SIGABRT` or `abort()` crashes on `com.meta.react.turbomodulemanager.queue`
- Anyone experiencing iOS crashes during app initialization that don't reproduce in the simulator
- Anyone using **Expo SDK 54** with native modules

---

## Symptoms You'll See

1. **Crash log shows**: `SIGABRT` or `abort()` on thread named `com.meta.react.turbomodulemanager.queue`
2. **Stack trace includes**: `RCTTurboModule.mm`, `performVoidMethodInvocation`, or `convertNSExceptionToJSError`
3. **The app crashes immediately on launch** -- you never see your JS code execute
4. **Simulator may work fine** -- the crash often only happens on physical devices
5. **The crash persists** even after removing most native modules

---

## Root Cause (Technical)

**File**: `node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm`

**Method**: `ObjCTurboModule::performVoidMethodInvocation`

**What happens**:

1. A TurboModule's void method is called asynchronously (on a background dispatch queue)
2. The native method throws an `NSException` (Objective-C exception)
3. The `@catch` block converts it to a C++ exception via `throw convertNSExceptionToJSError(...)`
4. On a background queue, **nothing catches the C++ exception**
5. The C++ runtime calls `std::terminate()` which calls `abort()`
6. Your app crashes before it even finishes initializing

**The buggy code** (before fix):

```objc
// Inside performVoidMethodInvocation
@try {
    [inv invokeWithTarget:strongModule];
} @catch (NSException *exception) {
    // BUG: This ALWAYS throws a C++ exception, even on async background queues
    // where nothing can catch it, causing abort()
    throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);
}
```

**Why it's a bug**: The method checks `shouldVoidMethodsExecuteSync_` to decide whether to run synchronously or asynchronously, but the `@catch` block doesn't check this flag. When running async, the C++ throw has no handler and crashes.

**Upstream references**:
- GitHub Issue: [facebook/react-native#54859](https://github.com/facebook/react-native/issues/54859)
- Fix PR: [facebook/react-native#50193](https://github.com/facebook/react-native/pull/50193)
- Discussion: [reactwg/react-native-new-architecture#276](https://github.com/reactwg/react-native-new-architecture/discussions/276)

---

## The Fix

### Option A: Upgrade React Native (Preferred if possible)

If you can upgrade to React Native **0.82+** (or a patched 0.81 release), the fix is already included upstream. This is always the safest option.

### Option B: Expo Config Plugin Patch (What we used)

If you're locked to RN 0.81 (e.g., by Expo SDK compatibility), create a config plugin that patches the file during the build process.

**Create `plugins/fixTurboModuleCrash.js`:**

```javascript
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withTurboModuleCrashFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const turboModulePath = path.join(
        config.modRequest.projectRoot,
        'node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm'
      );

      // FAIL the build if the file isn't found -- don't silently skip
      if (!fs.existsSync(turboModulePath)) {
        throw new Error(
          '[TurboModuleFix] FATAL: RCTTurboModule.mm not found. Cannot apply crash fix.'
        );
      }

      let content = fs.readFileSync(turboModulePath, 'utf8');

      // Step 1: Find the performVoidMethodInvocation method
      const methodSignature = 'void ObjCTurboModule::performVoidMethodInvocation';
      const methodStart = content.indexOf(methodSignature);
      if (methodStart === -1) {
        throw new Error(
          '[TurboModuleFix] FATAL: performVoidMethodInvocation not found. RN version may have changed.'
        );
      }

      // Step 2: Search for the @catch block within the method (bounded to 2000 chars)
      const searchRegion = content.substring(methodStart, methodStart + 2000);
      const catchIndex = searchRegion.indexOf('@catch (NSException *exception) {');
      if (catchIndex === -1) {
        throw new Error(
          '[TurboModuleFix] FATAL: @catch block not found in performVoidMethodInvocation.'
        );
      }

      // Step 3: Find the unconditional throw
      const throwIndex = searchRegion.indexOf('throw convertNSExceptionToJSError', catchIndex);
      if (throwIndex === -1) {
        // Already patched -- this is OK
        console.log('[TurboModuleFix] Already patched - no changes needed');
        return config;
      }

      // Step 4: Safety check -- throw should be close to the @catch
      if (throwIndex - catchIndex > 200) {
        throw new Error(
          '[TurboModuleFix] FATAL: Unexpected code structure. File may have changed.'
        );
      }

      // Step 5: Extract and replace the throw line
      const throwLineStart = searchRegion.lastIndexOf('\n', throwIndex) + 1;
      const throwLineEnd = searchRegion.indexOf('\n', throwIndex);
      const throwLine = searchRegion.substring(throwLineStart, throwLineEnd);
      const indent = throwLine.match(/^(\s*)/)[1];

      // The fix: only throw for sync methods, log for async
      const fixedBlock = [
        `${indent}if (shouldVoidMethodsExecuteSync_) {`,
        `${indent}  throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);`,
        `${indent}} else {`,
        `${indent}  NSLog(@"[TurboModule] Exception in async void method %s.%s: %@", moduleName, methodNameStr.c_str(), exception);`,
        `${indent}}`
      ].join('\n');

      const absoluteThrowStart = methodStart + throwLineStart;
      const absoluteThrowEnd = methodStart + throwLineEnd;
      content = content.substring(0, absoluteThrowStart) + fixedBlock + content.substring(absoluteThrowEnd);

      fs.writeFileSync(turboModulePath, content, 'utf8');

      // Step 6: Verify the patch was applied
      const verifyContent = fs.readFileSync(turboModulePath, 'utf8');
      if (verifyContent.includes('shouldVoidMethodsExecuteSync_') &&
          verifyContent.includes('Exception in async void method')) {
        console.log('[TurboModuleFix] Successfully patched RCTTurboModule.mm');
      } else {
        throw new Error(
          '[TurboModuleFix] FATAL: Patch verification failed.'
        );
      }

      return config;
    },
  ]);
}

module.exports = withTurboModuleCrashFix;
```

**Register in `app.config.js`:**

```javascript
plugins: [
  './plugins/fixTurboModuleCrash',
  // ... other plugins
]
```

---

## The Full Journey: What We Tried (and Why It Didn't Work)

This section documents every approach we attempted, in order. If you're troubleshooting a similar issue, you can skip the ones that don't apply to you.

### Phase 1-5: Removing Problematic Native Modules

**What we tried**: Systematically removed native modules that were crashing:
- `react-native-reanimated` (SIGSEGV crash)
- Various `expo-*` modules with native components

**Result**: Crashes shifted but didn't stop. Each removal revealed a new crashing module underneath.

**Lesson**: If removing one native module reveals another crash, the root cause is deeper than any individual module.

### Phase 6: Disabling New Architecture

**What we tried**: Set `newArchEnabled: false` to bypass TurboModule system entirely.

**Result**: Different crash -- `RCTThirdPartyComponentsProvider.mm` nil dictionary crash. RN 0.81 codegen generates Fabric component references even with old arch disabled, but Fabric classes aren't linked.

**Lesson**: On RN 0.81, you cannot simply disable New Architecture to avoid TurboModule issues. The codegen still references Fabric components.

### Phase 7: Updating Expo SDK Patch Version

**What we tried**: Updated Expo 54.0.32 to 54.0.33, disabled `expo-updates` (known Expo SDK 54 bug).

**Result**: Helped with one specific crash but didn't resolve the TurboModule issue.

**Lesson**: Always check Expo's GitHub issues for known bugs in your exact SDK version.

### Phase 8-9: Re-enabling New Architecture + Building from Source

**What we tried**: 
- Re-enabled New Architecture (`newArchEnabled: true`)
- Set `buildReactNativeFromSource: true` for iOS

**Result**: Eliminated the nil dictionary crash. RN 0.81's precompiled XCFrameworks have a known bug; building from source compiles correct Fabric classes.

**Lesson**: `newArchEnabled: true` + `buildReactNativeFromSource: true` is the only viable configuration for RN 0.81 on iOS.

### Phase 10-14: Aggressive TurboModule Removal

**What we tried**: Removed ALL non-essential TurboModules one by one:
- expo-secure-store, expo-clipboard, expo-document-picker, expo-file-system
- expo-image-picker, expo-localization, @react-native-community/netinfo
- react-native-webview, expo-constants, expo-linking, expo-status-bar, expo-linear-gradient

Replaced each with pure-JS stubs using React Native built-ins.

**Result**: Reduced dependencies from 44 to 21, but the SIGABRT crash persisted. Even with only 5 native modules remaining (expo core, AsyncStorage, screens, safe-area, gesture-handler), the crash continued.

**Lesson**: The crash is in React Native's core TurboModule infrastructure, not in any specific module. Removing modules cannot fix it.

### Phase 15: Patching RCTTurboModule.mm (The Fix)

**What we did**: Created an Expo config plugin that patches the buggy exception handling in `performVoidMethodInvocation` to conditionally handle exceptions based on sync/async execution.

**Result**: Build 54 -- no crashes. App launches and runs normally.

---

## Key Configuration Requirements

These settings are mandatory for RN 0.81 + Expo SDK 54 on iOS:

```javascript
// app.config.js or app.json
{
  "expo": {
    "updates": { "enabled": false },  // Expo SDK 54 startup crash fix
    "plugins": [
      "./plugins/fixTurboModuleCrash",
      ["expo-build-properties", {
        "ios": {
          "newArchEnabled": true,       // MUST be true on RN 0.81
          "buildReactNativeFromSource": true  // Precompiled XCFrameworks are buggy
        }
      }]
    ]
  }
}
```

**Build command must include `--clear-cache`**:
```bash
eas build --platform ios --profile production --clear-cache
```

---

## How to Diagnose This Crash

If you're seeing mysterious iOS crashes, here's how to confirm it's this specific bug:

1. **Check the crash thread name**: Look for `com.meta.react.turbomodulemanager.queue`
2. **Check the crash type**: Should be `SIGABRT` (signal abort) or `EXC_CRASH (SIGABRT)`
3. **Check the stack trace**: Look for `RCTTurboModule.mm` and/or `performVoidMethodInvocation`
4. **Check your RN version**: This affects RN 0.81.x (fixed in 0.82+)
5. **Check if New Architecture is enabled**: This only affects New Architecture builds

If all five match, you've hit this bug.

---

## Warning to Other Developers

### If you're starting a new Expo project:
- Use Expo SDK 52+ with RN 0.76+ if possible (more stable New Architecture support)
- If you must use Expo SDK 54, be aware of these iOS-specific issues
- Always test on a physical iOS device, not just the simulator

### If you're maintaining an existing RN 0.81 project:
- The TurboModule crash is a **framework bug**, not your code's fault
- Don't waste time removing native modules one by one -- the bug is in RN core
- Apply the patch or upgrade RN

### If you're choosing native modules:
- Fewer native modules = fewer potential crash points
- Always have JS stub fallbacks ready for non-essential native features
- Test each native module individually on a physical device after adding it

---

## Quick Reference: Crash Types and Their Fixes

| Crash | Thread | Cause | Fix |
|-------|--------|-------|-----|
| SIGABRT abort() | turbomodulemanager.queue | RN 0.81 bug in performVoidMethodInvocation | Patch RCTTurboModule.mm or upgrade RN |
| SIGSEGV nil dictionary | JavaScript thread | RN 0.81 precompiled XCFrameworks bug | Set buildReactNativeFromSource: true |
| nil crash in RCTThirdPartyComponentsProvider | Main thread | Codegen generates Fabric refs with old arch | Enable New Architecture (newArchEnabled: true) |
| SIGSEGV pointer auth failure | JavaScript thread | react-native-webview incompatible with New Arch | Remove react-native-webview, use JS fallback |
| Startup crash | Main thread | expo-updates SDK 54 bug | Disable expo-updates in app.json |

---

## Files Modified in This Fix

```
plugins/fixTurboModuleCrash.js   -- Config plugin that patches RCTTurboModule.mm
app.config.js                     -- Registers the plugin
metro.config.js                   -- Stub resolver for removed native modules
src/stubs/                        -- JS stub replacements for removed modules
```

---

## Timeline

- **Builds 1-45**: Various native module crashes, systematic removal
- **Builds 46-49**: Nil dictionary crashes, architecture configuration experiments
- **Builds 50-53**: TurboModule SIGABRT, progressive module removal (didn't help)
- **Build 54**: Applied RCTTurboModule.mm patch -- **SUCCESS, no crashes**

Total builds: 54
Total phases: 15
Dependencies removed: 23 (from 44 to 21)
Root cause: 1 line of code in React Native's C++ runtime

---

*This guide was written from direct experience resolving 53+ consecutive iOS build failures. If it helps you avoid even one failed build, it was worth documenting.*
