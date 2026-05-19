const fs = require('fs');
const path = require('path');

// ─── Patch 1: RCTTurboModule async void exception handling ───────────────────

const turboModulePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'ReactCommon',
  'react',
  'nativemodule',
  'core',
  'platform',
  'ios',
  'ReactCommon',
  'RCTTurboModule.mm'
);

const methodSignature = 'void ObjCTurboModule::performVoidMethodInvocation';
const catchSignature = '@catch (NSException *exception) {';
const patchMarker = 'Exception in async void method';

function fail(message) {
  throw new Error(`[TurboModuleFix] ${message}`);
}

function patchTurboModuleCrash() {
  if (!fs.existsSync(turboModulePath)) {
    fail(`RCTTurboModule.mm not found at ${turboModulePath}`);
  }

  const content = fs.readFileSync(turboModulePath, 'utf8');
  if (content.includes(patchMarker)) {
    console.log('[TurboModuleFix] Patch already applied');
    return;
  }

  const methodStart = content.indexOf(methodSignature);
  if (methodStart === -1) {
    fail('performVoidMethodInvocation not found. React Native version may have changed.');
  }

  const searchRegion = content.substring(methodStart, methodStart + 3000);
  const catchIndex = searchRegion.indexOf(catchSignature);
  if (catchIndex === -1) {
    fail('@catch block not found in performVoidMethodInvocation.');
  }

  const throwIndex = searchRegion.indexOf('throw convertNSExceptionToJSError', catchIndex);
  if (throwIndex === -1) {
    fail('Expected throw convertNSExceptionToJSError call not found.');
  }

  const throwLineStart = searchRegion.lastIndexOf('\n', throwIndex) + 1;
  const throwLineEnd = searchRegion.indexOf('\n', throwIndex);
  const throwLine = searchRegion.substring(throwLineStart, throwLineEnd);
  const indentMatch = throwLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '    ';

  const replacement = [
    `${indent}if (shouldVoidMethodsExecuteSync_) {`,
    `${indent}  throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);`,
    `${indent}} else {`,
    `${indent}  NSLog(@"[TurboModule] Exception in async void method %s.%s: %@", moduleName, methodNameStr.c_str(), exception);`,
    `${indent}}`,
  ].join('\n');

  const absoluteThrowStart = methodStart + throwLineStart;
  const absoluteThrowEnd = methodStart + throwLineEnd;

  const patchedContent =
    content.substring(0, absoluteThrowStart) + replacement + content.substring(absoluteThrowEnd);

  fs.writeFileSync(turboModulePath, patchedContent, 'utf8');

  const verifiedContent = fs.readFileSync(turboModulePath, 'utf8');
  if (!verifiedContent.includes(patchMarker) || !verifiedContent.includes('shouldVoidMethodsExecuteSync_')) {
    fail('Patch verification failed.');
  }

  console.log('[TurboModuleFix] Successfully patched RCTTurboModule.mm');
}

patchTurboModuleCrash();

// ─── Patch 2: Google Sign-In @try/@catch in production builds ────────────────
// RNGoogleSignin.mm wraps GIDSignIn signIn call in @try/@catch only in #if DEBUG,
// so any NSException from the Google SDK crashes the app in production/TestFlight.
// This patch removes the #if DEBUG guards so the catch applies in all builds.

const googleSignInPath = path.join(
  __dirname, '..', 'node_modules',
  '@react-native-google-signin', 'google-signin', 'ios', 'RNGoogleSignin.mm'
);
const googlePatchMarker = 'Exception in async void method'; // reuse a different one
const googlePatchedMarker = 'Encountered an error when signing in. If';

function patchGoogleSignInCrash() {
  if (!fs.existsSync(googleSignInPath)) {
    console.warn('[GoogleSignInFix] RNGoogleSignin.mm not found — skipping patch');
    return;
  }

  const content = fs.readFileSync(googleSignInPath, 'utf8');
  if (content.includes(googlePatchedMarker)) {
    console.log('[GoogleSignInFix] Patch already applied');
    return;
  }

  const oldBlock = [
    '#if DEBUG',
    '    @try {',
    '#endif',
    '      [GIDSignIn.sharedInstance signInWithPresentingViewController:RCTPresentedViewController() hint:hint additionalScopes:scopes completion:^(GIDSignInResult * _Nullable signInResult, NSError * _Nullable error) {',
    '        [self handleCompletion:signInResult withError:error withResolver:resolve withRejector:reject fromCallsite:@"signIn"];',
    '      }];',
    '#if DEBUG',
    '    }',
    '    @catch (NSException *exception) {',
    '      NSString *errorMessage = [NSString stringWithFormat:@"Encountered an error when signing in (see more below). If the error is \'Your app is missing support for the following URL schemes...\'',
  ].join('\n');

  if (!content.includes('#if DEBUG\n    @try {')) {
    console.warn('[GoogleSignInFix] Expected #if DEBUG block not found — patch may already be applied or source changed');
    return;
  }

  const patched = content
    .replace(
      /#if DEBUG\n    @try \{\n#endif\n(\s+\[GIDSignIn\.sharedInstance signInWithPresentingViewController[\s\S]*?\];)\n#if DEBUG\n    \}\n    @catch \(NSException \*exception\) \{\n\s+NSString \*errorMessage = \[NSString stringWithFormat:@"Encountered an error when signing in \(see more below\)[\s\S]*?reject\(@"SIGN_IN_ERROR", errorMessage, nil\);\n    \}\n#endif/,
      (match, callBlock) => {
        return `    @try {\n${callBlock}\n    }\n    @catch (NSException *exception) {\n      NSString *errorMessage = [NSString stringWithFormat:@"Encountered an error when signing in. If the error is 'Your app is missing support for the following URL schemes...', follow the troubleshooting guide at https://react-native-google-signin.github.io/docs/troubleshooting#ios\\n\\n%@", exception.description];\n      reject(@"SIGN_IN_ERROR", errorMessage, nil);\n    }`;
      }
    );

  if (patched === content) {
    console.warn('[GoogleSignInFix] Regex did not match — skipping patch');
    return;
  }

  fs.writeFileSync(googleSignInPath, patched, 'utf8');
  console.log('[GoogleSignInFix] Successfully patched RNGoogleSignin.mm');
}

patchGoogleSignInCrash();

// ─── Patch 3: brace-expansion 5.x missing .default export ───────────────────
// minimatch v10's CJS build (used by @expo/fingerprint) does:
//   const brace_expansion_1 = require("brace-expansion");
//   (0, brace_expansion_1.default)(pattern)
// brace-expansion 5.x exports { expand } with no .default alias, so the call
// throws TypeError. Adding exports.default = expand fixes the fingerprint step.

const braceExpansionPath = path.join(
  __dirname, '..', 'node_modules',
  '@expo', 'fingerprint', 'node_modules',
  'brace-expansion', 'dist', 'commonjs', 'index.js'
);
const braceExpansionMarker = 'exports.default = expand';

function patchBraceExpansion() {
  if (!fs.existsSync(braceExpansionPath)) {
    console.warn('[BraceExpansionFix] brace-expansion CJS index not found — skipping');
    return;
  }
  const content = fs.readFileSync(braceExpansionPath, 'utf8');
  if (content.includes(braceExpansionMarker)) {
    console.log('[BraceExpansionFix] Patch already applied');
    return;
  }
  // Insert .default alias immediately after the exports.expand = expand line
  const anchor = 'exports.expand = expand;';
  if (!content.includes(anchor)) {
    console.warn('[BraceExpansionFix] Expected anchor not found — source may have changed');
    return;
  }
  const patched = content.replace(anchor, `${anchor}\nexports.default = expand;`);
  fs.writeFileSync(braceExpansionPath, patched, 'utf8');
  console.log('[BraceExpansionFix] Successfully patched brace-expansion/dist/commonjs/index.js');
}

patchBraceExpansion();