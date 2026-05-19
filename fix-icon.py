#!/usr/bin/env python3
"""
Fix iOS app icon brightness issue
Removes transparency, increases brightness and saturation
"""

try:
    from PIL import Image, ImageEnhance
    import os
    
    print("🎨 Glamora Icon Brightness Fix")
    print("=" * 40)
    print()
    
    icon_path = "./assets/icon.png"
    backup_path = "./assets/icon-original.png"
    
    if not os.path.exists(icon_path):
        print(f"❌ Icon not found at {icon_path}")
        exit(1)
    
    # Open the icon
    print("📂 Opening icon...")
    img = Image.open(icon_path)
    
    # Create backup
    print("💾 Creating backup...")
    img.save(backup_path, "PNG", quality=100)
    
    # Convert to RGB (remove transparency with white background)
    print("🎨 Removing transparency...")
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        # Create white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize to 1024x1024
    print("📐 Resizing to 1024x1024...")
    img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    # Increase brightness by 15%
    print("💡 Increasing brightness by 15%...")
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.15)
    
    # Increase saturation by 20%
    print("🌈 Increasing saturation by 20%...")
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.20)
    
    # Save the result
    print("💾 Saving enhanced icon...")
    img.save(icon_path, "PNG", quality=100, optimize=True)
    
    print()
    print("✅ Icon enhanced successfully!")
    print()
    print("Changes applied:")
    print("  • Removed transparency (white background)")
    print("  • Increased brightness by 15%")
    print("  • Increased saturation by 20%")
    print("  • Resized to 1024x1024")
    print()
    print(f"📁 Original saved to: {backup_path}")
    print()
    print("Next steps:")
    print("1. Review: open ./assets/icon.png")
    print("2. Rebuild: eas build --platform ios")
    print()
    
except ImportError:
    print("❌ Pillow not installed")
    print()
    print("Installing Pillow...")
    import subprocess
    subprocess.check_call(["pip3", "install", "--user", "Pillow"])
    print()
    print("✅ Pillow installed! Please run this script again:")
    print("   python3 fix-icon.py")
    print()
