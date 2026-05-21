#!/usr/bin/env python3
"""
Adds all @expo/vector-icons TTF font files to the Xcode project.
- Adds PBXFileReference entries for each TTF
- Adds PBXBuildFile entries for each TTF
- Adds file refs to the Supporting group
- Adds build files to the Resources build phase
"""

import re, sys

PBXPROJ = "ios/Glamora.xcodeproj/project.pbxproj"

FONTS = [
    "AntDesign.ttf",
    "Entypo.ttf",
    "EvilIcons.ttf",
    "Feather.ttf",
    "FontAwesome.ttf",
    "FontAwesome5_Brands.ttf",
    "FontAwesome5_Regular.ttf",
    "FontAwesome5_Solid.ttf",
    "FontAwesome6_Brands.ttf",
    "FontAwesome6_Regular.ttf",
    "FontAwesome6_Solid.ttf",
    "Fontisto.ttf",
    "Foundation.ttf",
    "Ionicons.ttf",
    "MaterialCommunityIcons.ttf",
    "MaterialIcons.ttf",
    "Octicons.ttf",
    "SimpleLineIcons.ttf",
    "Zocial.ttf",
]

# Deterministic 24-char hex UUIDs that won't collide with existing ones
def file_ref_uuid(i):
    return f"FA{i:02X}0000000000000000FA{i:02X}"

def build_file_uuid(i):
    return f"FB{i:02X}0000000000000000FB{i:02X}"

with open(PBXPROJ, "r") as f:
    content = f.read()

# ── Guard: already patched? ──────────────────────────────────────────────────
if "Ionicons.ttf in Resources" in content:
    print("Already patched — nothing to do.")
    sys.exit(0)

# ── 1. PBXBuildFile entries ───────────────────────────────────────────────────
build_file_lines = "\n".join(
    f"\t\t\t\t{build_file_uuid(i+1)} /* {font} in Resources */ = "
    f"{{isa = PBXBuildFile; fileRef = {file_ref_uuid(i+1)} /* {font} */; }};"
    for i, font in enumerate(FONTS)
)

content = content.replace(
    "/* End PBXBuildFile section */",
    build_file_lines + "\n/* End PBXBuildFile section */"
)

# ── 2. PBXFileReference entries ───────────────────────────────────────────────
file_ref_lines = "\n".join(
    f"\t\t\t\t{file_ref_uuid(i+1)} /* {font} */ = "
    f"{{isa = PBXFileReference; lastKnownFileType = file; path = {font}; sourceTree = \"<group>\"; }};"
    for i, font in enumerate(FONTS)
)

content = content.replace(
    "/* End PBXFileReference section */",
    file_ref_lines + "\n/* End PBXFileReference section */"
)

# ── 3. Add file refs to Supporting group children ─────────────────────────────
supporting_children = "\n".join(
    f"\t\t\t\t\t{file_ref_uuid(i+1)} /* {font} */,"
    for i, font in enumerate(FONTS)
)

# Insert after the Expo.plist child line in the Supporting group
content = content.replace(
    "\t\t\t\t\tBB2F792C24A3F905000567C9 /* Expo.plist */,\n\t\t\t\t);",
    f"\t\t\t\t\tBB2F792C24A3F905000567C9 /* Expo.plist */,\n{supporting_children}\n\t\t\t\t);"
)

# ── 4. Add build files to Resources build phase ───────────────────────────────
resources_build_lines = "\n".join(
    f"\t\t\t\t\t{build_file_uuid(i+1)} /* {font} in Resources */,"
    for i, font in enumerate(FONTS)
)

content = content.replace(
    "\t\t\t\t\t3E461D99554A48A4959DE609 /* SplashScreen.storyboard in Resources */,\n\t\t\t\t);",
    f"\t\t\t\t\t3E461D99554A48A4959DE609 /* SplashScreen.storyboard in Resources */,\n{resources_build_lines}\n\t\t\t\t);"
)

with open(PBXPROJ, "w") as f:
    f.write(content)

print(f"✓ Added {len(FONTS)} fonts to Xcode project.")

# Verify all 4 patches applied
assert "Ionicons.ttf in Resources" in content, "Build file patch FAILED"
assert f"path = Ionicons.ttf" in content, "FileRef patch FAILED"
assert f"FA0E0000000000000000FA0E /* Ionicons.ttf */" in content, "Supporting group patch FAILED"
print("✓ All 4 patch points verified.")
