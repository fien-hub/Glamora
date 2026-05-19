#!/usr/bin/env python3
"""
Make white/light elements in the icon pure white for maximum contrast
No numpy required - pure PIL
"""

from PIL import Image

print("🎨 Making Icon Elements Pure White")
print("=" * 40)
print()

icon_path = "./assets/icon.png"

# Open the icon
print("📂 Opening icon...")
img = Image.open(icon_path).convert('RGB')

# Load pixel data
print("🔍 Analyzing pixels...")
pixels = img.load()
width, height = img.size

# Process each pixel
print("⚪ Converting light elements to pure white...")
processed = 0

for y in range(height):
    for x in range(width):
        r, g, b = pixels[x, y]
        
        # Calculate brightness (average of RGB)
        brightness = (r + g + b) / 3
        
        # If pixel is light (brightness > 180 out of 255), make it pure white
        if brightness > 180:
            pixels[x, y] = (255, 255, 255)
            processed += 1

# Save the result
print(f"💾 Saving enhanced icon ({processed:,} pixels made pure white)...")
img.save(icon_path, "PNG", quality=100, optimize=True)

print()
print("✅ Pure white elements applied!")
print()
print("Changes:")
print(f"  • {processed:,} light pixels converted to pure white (#FFFFFF)")
print("  • Maximum contrast and vibrancy achieved")
print()
print("Next: Review and rebuild with: eas build --platform ios")
print()
