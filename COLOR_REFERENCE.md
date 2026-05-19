# 🎨 Quick Color Reference Guide

## Coral/Peach Shades (Primary Brand Color)

```
🧡 primary         #F4B5A4  rgb(244, 181, 164)  ← Main buttons, CTAs
🍑 primaryDark     #E89580  rgb(232, 149, 128)  ← Hover states, emphasis
🔶 primaryDarker   #D97A5F  rgb(217, 122, 95)   ← High contrast text/icons
🌺 primaryLight    #F8CFC3  rgb(248, 207, 195)  ← Selected backgrounds
🌸 primaryLighter  #FCE5DF  rgb(252, 229, 223)  ← Subtle backgrounds
🦢 primarySubtle   #FEF5F2  rgb(254, 245, 242)  ← Almost white tint
```

## Grey Shades (Secondary - Utility)

```
⚫ secondaryDark   #6B7280  rgb(107, 114, 128)  ← Dark grey emphasis
⚪ secondary       #9CA3AF  rgb(156, 163, 175)  ← Secondary buttons
🔘 secondaryLight  #D1D5DB  rgb(209, 213, 219)  ← Light grey borders
☁️ secondarySubtle #F3F4F6  rgb(243, 244, 246)  ← Very light grey
```

## Teal Shades (Tertiary - Accent)

```
🌊 tertiaryDark   #2DD4BF  rgb(45, 212, 191)   ← Dark teal emphasis
💎 tertiary       #5EEAD4  rgb(94, 234, 212)   ← Teal accents
🐚 tertiaryLight  #99F6E4  rgb(153, 246, 228)  ← Light teal
🧊 tertiarySubtle #CCFBF1  rgb(204, 251, 241)  ← Very light teal
```

## High Contrast Alias

```
🔶 highContrastCoral  #D97A5F  (same as primaryDarker)
```

---

## Quick Decision Tree

### "What color should I use?"

#### For Buttons:
- **Primary action?** → `colors.primary` (coral)
- **Secondary/neutral action?** → `colors.secondary` (grey)
- **Special feature?** → `colors.tertiary` (teal)
- **Destructive action?** → `colors.error` (red)

#### For Text:
- **On white background?** → `colors.primaryDarker` (coral) or `colors.text` (black)
- **On coral background?** → `colors.text` (black) or `colors.white`
- **On grey background?** → `colors.white` or `colors.text`
- **Secondary text?** → `colors.textSecondary`
- **Links?** → `colors.primaryDarker`

#### For Backgrounds:
- **Selected state?** → `colors.primaryLight` (coral)
- **Subtle section?** → `colors.primaryLighter` or `colors.secondarySubtle` (grey)
- **Large area?** → `colors.primarySubtle` (coral) or `colors.white`
- **Info box?** → `colors.tertiarySubtle` (teal)

#### For Icons:
- **Active/selected?** → `colors.primaryDarker` (coral)
- **Inactive?** → `colors.textLight` (grey)
- **On coral background?** → `colors.white` or `colors.text`
- **Special feature?** → `colors.tertiary` (teal)

#### For Borders:
- **High visibility?** → `colors.primaryDarker` (coral)
- **Medium visibility?** → `colors.primaryDark` (coral) or `colors.secondaryDark` (grey)
- **Subtle?** → `colors.border` (light grey)

---

## Common Patterns

### Pattern 1: Primary Button
```typescript
{
  backgroundColor: colors.primary,        // #F4B5A4
  color: colors.black,
  shadowColor: colors.primary,
}
```

### Pattern 2: Secondary Button (Grey)
```typescript
{
  backgroundColor: colors.secondary,      // #9CA3AF
  color: colors.white,
  borderWidth: 1,
  borderColor: colors.secondaryDark,      // #6B7280
}
```

### Pattern 3: Selected Card (Coral)
```typescript
{
  backgroundColor: colors.primaryLight,   // #F8CFC3
  borderColor: colors.primary,            // #F4B5A4
  borderWidth: 2,
}
```

### Pattern 4: Teal Accent Button
```typescript
{
  backgroundColor: colors.tertiary,       // #5EEAD4
  color: colors.black,
  shadowColor: colors.tertiary,
}
```

### Pattern 5: Active Tab
```typescript
{
  backgroundColor: colors.primaryDarker,  // #D97A5F
  color: colors.white,
}
```

### Pattern 6: Link Text
```typescript
{
  color: colors.primaryDarker,            // #D97A5F
  textDecorationLine: 'underline',
}
```

### Pattern 7: Info Box (Coral)
```typescript
{
  backgroundColor: colors.primaryLighter, // #FCE5DF
  borderLeftWidth: 3,
  borderLeftColor: colors.primary,        // #F4B5A4
}
```

### Pattern 8: Info Box (Teal)
```typescript
{
  backgroundColor: colors.tertiarySubtle, // #CCFBF1
  borderLeftWidth: 3,
  borderLeftColor: colors.tertiary,       // #5EEAD4
}
```

---

## Color Combinations That Work Well

### Coral + Black Text
```typescript
backgroundColor: colors.primary,     // #F4B5A4
color: colors.black,                 // Dark text
```

### Grey + White Text
```typescript
backgroundColor: colors.secondary,   // #9CA3AF
color: colors.white,                 // White text
```

### Dark Coral + White Text
```typescript
backgroundColor: colors.primaryDarker, // #D97A5F
color: colors.white,                   // White text
```

### Teal + Black Text
```typescript
backgroundColor: colors.tertiary,    // #5EEAD4
color: colors.black,                 // Dark text
```

### Light Coral + Dark Coral Border
```typescript
backgroundColor: colors.primaryLight,  // #F8CFC3
borderColor: colors.primaryDarker,     // #D97A5F
color: colors.text,                    // Dark text
```

### White + Coral Border
```typescript
backgroundColor: colors.white,       // #FFFFFF
borderColor: colors.primary,         // #F4B5A4
color: colors.text,                  // Dark text
```

---

## Don'ts ❌

- ❌ Don't use `primary` (#F4B5A4) for text on white (too light, use `primaryDarker`)
- ❌ Don't use `secondary` grey for primary CTAs (use coral)
- ❌ Don't mix too many colors in one component (keep it simple)
- ❌ Don't use dark shades for large backgrounds (too intense)
- ❌ Don't use subtle shades for important CTAs (not visible enough)
- ❌ Don't overuse teal (it's an accent, not a primary color)

## Do's ✅

- ✅ Use `primaryDarker` (#D97A5F) for text/icons on white backgrounds
- ✅ Use `primary` (#F4B5A4) for all primary button backgrounds
- ✅ Use `secondary` grey for neutral/utility buttons
- ✅ Use `tertiary` teal sparingly for special features
- ✅ Use light coral shades for selected states
- ✅ Use subtle coral shades for large backgrounds
- ✅ Maintain consistent coral usage for brand identity

---

**Quick Tip:** When in doubt, use coral! It's the hero of the Glamora brand. Grey and teal are supporting actors. 🧡

