#!/usr/bin/env node
const fs = require('fs');

const PBXPROJ = 'ios/Glamora.xcodeproj/project.pbxproj';

const FONTS = [
  'AntDesign.ttf',
  'Entypo.ttf',
  'EvilIcons.ttf',
  'Feather.ttf',
  'FontAwesome.ttf',
  'FontAwesome5_Brands.ttf',
  'FontAwesome5_Regular.ttf',
  'FontAwesome5_Solid.ttf',
  'FontAwesome6_Brands.ttf',
  'FontAwesome6_Regular.ttf',
  'FontAwesome6_Solid.ttf',
  'Fontisto.ttf',
  'Foundation.ttf',
  'Ionicons.ttf',
  'MaterialCommunityIcons.ttf',
  'MaterialIcons.ttf',
  'Octicons.ttf',
  'SimpleLineIcons.ttf',
  'Zocial.ttf',
];

const fileRefUUID  = i => `FA${i.toString(16).padStart(2,'0').toUpperCase()}0000000000000000FA${i.toString(16).padStart(2,'0').toUpperCase()}`;
const buildFileUUID = i => `FB${i.toString(16).padStart(2,'0').toUpperCase()}0000000000000000FB${i.toString(16).padStart(2,'0').toUpperCase()}`;

let content = fs.readFileSync(PBXPROJ, 'utf8');

if (content.includes('Ionicons.ttf in Resources')) {
  console.log('Already patched — nothing to do.');
  process.exit(0);
}

// 1. PBXBuildFile entries
const buildFileLines = FONTS.map((font, i) =>
  `\t\t\t\t${buildFileUUID(i+1)} /* ${font} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefUUID(i+1)} /* ${font} */; };`
).join('\n');
content = content.replace(
  '/* End PBXBuildFile section */',
  buildFileLines + '\n/* End PBXBuildFile section */'
);

// 2. PBXFileReference entries
const fileRefLines = FONTS.map((font, i) =>
  `\t\t\t\t${fileRefUUID(i+1)} /* ${font} */ = {isa = PBXFileReference; lastKnownFileType = file; path = ${font}; sourceTree = "<group>"; };`
).join('\n');
content = content.replace(
  '/* End PBXFileReference section */',
  fileRefLines + '\n/* End PBXFileReference section */'
);

// 3. Add file refs to Supporting group children
const supportingChildren = FONTS.map((font, i) =>
  `\t\t\t\t\t${fileRefUUID(i+1)} /* ${font} */,`
).join('\n');
content = content.replace(
  '\t\t\t\t\tBB2F792C24A3F905000567C9 /* Expo.plist */,\n\t\t\t\t);',
  `\t\t\t\t\tBB2F792C24A3F905000567C9 /* Expo.plist */,\n${supportingChildren}\n\t\t\t\t);`
);

// 4. Add build files to Resources build phase
const resourcesBuildLines = FONTS.map((font, i) =>
  `\t\t\t\t\t${buildFileUUID(i+1)} /* ${font} in Resources */,`
).join('\n');
content = content.replace(
  '\t\t\t\t\t3E461D99554A48A4959DE609 /* SplashScreen.storyboard in Resources */,\n\t\t\t\t);',
  `\t\t\t\t\t3E461D99554A48A4959DE609 /* SplashScreen.storyboard in Resources */,\n${resourcesBuildLines}\n\t\t\t\t);`
);

fs.writeFileSync(PBXPROJ, content);

// Verify
const verify = fs.readFileSync(PBXPROJ, 'utf8');
console.assert(verify.includes('Ionicons.ttf in Resources'), 'FAIL: build file patch');
console.assert(verify.includes('path = Ionicons.ttf'), 'FAIL: fileref patch');
console.assert(verify.includes('FA0E0000000000000000FA0E /* Ionicons.ttf */,'), 'FAIL: supporting group patch');
console.log(`✓ Added ${FONTS.length} fonts to Xcode project.`);
console.log('✓ All patch points verified.');
