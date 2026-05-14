#!/bin/bash

# Script to optimize your app icon for iOS
# This will make your icon brighter and remove transparency

echo "🎨 Glamora Icon Brightness Fix"
echo "================================"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    echo "Run: brew install imagemagick"
    exit 1
fi

cd "$(dirname "$0")"

ICON_PATH="./assets/icon.png"
BACKUP_PATH="./assets/icon-original.png"

if [ ! -f "$ICON_PATH" ]; then
    echo "❌ Icon not found at $ICON_PATH"
    exit 1
fi

echo "📋 Creating backup..."
cp "$ICON_PATH" "$BACKUP_PATH"

echo "✨ Applying brightness and saturation enhancements..."

# Fix the icon:
# 1. Remove transparency (add white background)
# 2. Increase brightness by 15%
# 3. Increase saturation by 20%
# 4. Ensure 1024x1024 size
convert "$ICON_PATH" \
    -background white \
    -alpha remove \
    -resize 1024x1024 \
    -modulate 115,120,100 \
    -quality 100 \
    "$ICON_PATH"

echo "✅ Icon enhanced!"
echo ""
echo "Changes applied:"
echo "  • Removed transparency"
echo "  • Increased brightness by 15%"
echo "  • Increased saturation by 20%"
echo "  • Resized to 1024x1024"
echo ""
echo "📁 Original saved to: $BACKUP_PATH"
echo ""
echo "Next steps:"
echo "1. Review the new icon: open ./assets/icon.png"
echo "2. If too bright, adjust the modulate values (115,120,100)"
echo "3. Rebuild your app: eas build --platform ios"
echo ""
