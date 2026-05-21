#!/usr/bin/env node
const fs = require('fs');

const PBXPROJ = 'ios/Glamora.xcodeproj/project.pbxproj';

const FONTS = [
  'AntDesign.ttf','Entypo.ttf','EvilIcons.ttf','Feather.ttf','FontAwesome.ttf',
  'FontAwesome5_Brands.ttf','FontAwesome5_Regular.ttf','FontAwesome5_Solid.ttf',
  'FontAwesome6_Brands.ttf','FontAwesome6_Regular.ttf','FontAwesome6_Solid.ttf',
  'Fontisto.ttf','Foundation.ttf','Ionicons.ttf','MaterialCommunityIcons.ttf',
  'MaterialIcons.ttf','Octicons.ttf','SimpleLineIcons.ttf','Zocial.ttf',
];

const hex = i => i.toString(16).padStart(2,'0').toUpperCase();
const fileRefUUID   = i => `FA${hex(i)}0000000000000000FA${hex(i)}`;
const buildFileUUID = i => `FB${hex(i)}0000000000000000FB${hex(i)}`;

let content = fs.readFileSync(PBXPROJ, 'utf8');

// ── Supporting group: 4 tabs for children, 3 tabs for closing ) ──────────────
const supportingChildren = FONTS.map((font, i) =>
  `\t\t\t\t${fileRefUUID(i+1)} /* ${font} */,`
).join('\n');

const supportingOld = `\t\t\t\tBB2F792C24A3F905000567C9 /* Expo.plist */,\n\t\t\t);`;
const supportingNew = `\t\t\t\tBB2F792C24A3F905000567C9 /* Expo.plist */,\n${supportingChildren}\n\t\t\t);`;

if (!content.includes(supportingOld)) {
  console.error('ERROR: Could not find Supporting group pattern. Current content:');
  const idx = content.indexOf('BB2F792C24A3F905000567C9 /* Expo.plist */');
  console.error(JSON.stringify(content.slice(Math.max(0,idx-5), idx+60)));
  process.exit(1);
}
content = content.replace(supportingOld, supportingNew);
console.log('✓ Supporting group patched');

// ── Resources build phase: 4 tabs for files, 3 tabs for closing ) ────────────
const resourcesLines = FONTS.map((font, i) =>
  `\t\t\t\t${buildFileUUID(i+1)} /* ${font} in Resources */,`
).join('\n');

const resourcesOld = `\t\t\t\t3E461D99554A48A4959DE609 /* SplashScreen.storyboard in Resources */,\n\t\t\t);`;
const resourcesNew = `\t\t\t\t3E461D99554A48A4959DE609 /* SplashScreen.storyboard in Resources */,\n${resourcesLines}\n\t\t\t);`;

if (!content.includes(resourcesOld)) {
  console.error('ERROR: Could not find Resources phase pattern.');
  const idx = content.indexOf('SplashScreen.storyboard in Resources');
  console.error(JSON.stringify(content.slice(Math.max(0,idx-5), idx+80)));
  process.exit(1);
}
content = content.replace(resourcesOld, resourcesNew);
console.log('✓ Resources build phase patched');

fs.writeFileSync(PBXPROJ, content);

// Final verification
const v = fs.readFileSync(PBXPROJ, 'utf8');
const checks = [
  ['Ionicons.ttf in Resources" */,', 'Supporting group has Ionicons fileRef'],
  ['FB0E0000000000000000FB0E /* Ionicons.ttf in Resources */,', 'Resources phase has Ionicons buildFile'],
];
let allOk = true;
for (const [needle, label] of checks) {
  if (v.includes(needle)) console.log(`✓ ${label}`);
  else { console.error(`✗ FAIL: ${label}`); allOk = false; }
}

// Count TTF occurrences in Resources phase
const resourcesMatch = v.match(/PBXResourcesBuildPhase[\s\S]*?End PBXResourcesBuildPhase/);
if (resourcesMatch) {
  const ttfCount = (resourcesMatch[0].match(/\.ttf in Resources/g) || []).length;
  console.log(`✓ ${ttfCount} TTF files in Resources build phase`);
}

process.exit(allOk ? 0 : 1);
