# 🎨 Glamora Color System - Coral/Peach

## Overview
Glamora uses a sophisticated single-color brand system with **Coral/Peach** as the primary brand color. The coral palette has 6 carefully crafted shades to create visual hierarchy, solve visibility issues, and maintain brand consistency. Grey and teal are used as utility colors for secondary actions and variety.

---

## 🧡 Primary Brand Color: Coral/Peach

### The 6 Coral Shades

| Shade Name | Hex Code | RGB | Visual | Purpose |
|------------|----------|-----|--------|---------|
| **primary** | `#F4B5A4` | rgb(244, 181, 164) | 🧡 Base Coral | Main brand color |
| **primaryDark** | `#E89580` | rgb(232, 149, 128) | 🍑 Medium Coral | Hover states, emphasis |
| **primaryDarker** | `#D97A5F` | rgb(217, 122, 95) | 🔶 Dark Coral | High contrast text/icons |
| **primaryLight** | `#F8CFC3` | rgb(248, 207, 195) | 🌺 Light Coral | Selected backgrounds |
| **primaryLighter** | `#FCE5DF` | rgb(252, 229, 223) | 🌸 Very Light Coral | Subtle backgrounds |
| **primarySubtle** | `#FEF5F2` | rgb(254, 245, 242) | 🦢 Almost White Coral | Barely-there tint |

### Coral Usage Guide

#### **1. `primary` (#F4B5A4) - Base Coral** 🧡
**Purpose:** Main brand color for primary actions

**Use For:**
- ✅ Primary buttons (Login, Sign Up, Continue)
- ✅ Main CTAs throughout the app
- ✅ Selected category chips
- ✅ Active states (when not needing high contrast)
- ✅ Brand accent elements

**Example:**
```typescript
backgroundColor: colors.primary, // #F4B5A4
```

#### **2. `primaryDark` (#E89580) - Medium Coral** 🍑
**Purpose:** Emphasis and hover states

**Use For:**
- ✅ Button hover states
- ✅ Emphasis text on light backgrounds
- ✅ Secondary emphasis elements
- ✅ Borders that need more visibility

**Example:**
```typescript
color: colors.primaryDark, // #E89580
```

#### **3. `primaryDarker` (#D97A5F) - Dark Coral** 🔶
**Purpose:** High contrast for visibility (replaces old highContrastPink)

**Use For:**
- ✅ Text on white backgrounds
- ✅ Icons that need high visibility
- ✅ Important borders
- ✅ Active tab indicators
- ✅ Links and clickable text

**Example:**
```typescript
color: colors.primaryDarker, // #D97A5F
// OR use the alias:
color: colors.highContrastCoral, // #D97A5F
```

#### **4. `primaryLight` (#F8CFC3) - Light Coral** 🌺
**Purpose:** Selected state backgrounds

**Use For:**
- ✅ Selected card backgrounds
- ✅ Selected radio/checkbox options
- ✅ Highlighted sections
- ✅ Active input fields

**Example:**
```typescript
backgroundColor: colors.primaryLight, // #F8CFC3
```

#### **5. `primaryLighter` (#FCE5DF) - Very Light Coral** 🌸
**Purpose:** Subtle section backgrounds

**Use For:**
- ✅ Section backgrounds
- ✅ Card backgrounds with subtle tint
- ✅ Divider backgrounds
- ✅ Info boxes

**Example:**
```typescript
backgroundColor: colors.primaryLighter, // #FCE5DF
```

#### **6. `primarySubtle` (#FEF5F2) - Almost White Coral** 🦢
**Purpose:** Barely-there tint for large areas

**Use For:**
- ✅ Large section backgrounds
- ✅ Screen backgrounds (when not pure white)
- ✅ Subtle overlays
- ✅ Chip backgrounds (unselected)

**Example:**
```typescript
backgroundColor: colors.primarySubtle, // #FEF5F2
```

---

## 🎨 Utility Colors: Grey & Teal

### Grey (Secondary)
Used for utility settings, secondary actions, and neutral elements.

| Color | Hex Code | Purpose |
|-------|----------|---------|
| **secondary** | `#9CA3AF` | Secondary buttons, neutral actions |
| **secondaryDark** | `#6B7280` | Darker grey for emphasis |
| **secondaryLight** | `#D1D5DB` | Light grey for borders |
| **secondarySubtle** | `#F3F4F6` | Very light grey backgrounds |

### Teal (Tertiary)
Used for variety, sophistication, and special features.

| Color | Hex Code | Purpose |
|-------|----------|---------|
| **tertiary** | `#5EEAD4` | Teal accents, special features |
| **tertiaryDark** | `#2DD4BF` | Darker teal for emphasis |
| **tertiaryLight** | `#99F6E4` | Light teal backgrounds |
| **tertiarySubtle** | `#CCFBF1` | Very light teal tint |

---

## 🎯 Strategic Color Usage

### When to Use Each Color

#### **Use Coral (Primary) For:**
- ✅ **All primary CTAs** (Login, Sign Up, Book Now, Confirm)
- ✅ **Main navigation** (active tabs, selected items)
- ✅ **Important actions** (Submit, Save, Continue)
- ✅ **Brand elements** (logos, headers, hero sections)
- ✅ **Selected states** (active cards, selected chips)
- ✅ **Customer & Provider actions** (all main interactions)

#### **Use Grey (Secondary) For:**
- ✅ **Secondary CTAs** (Cancel, Skip, Later, Back)
- ✅ **Utility buttons** (Settings, Edit, View Details)
- ✅ **Neutral actions** (More Info, Learn More)
- ✅ **Borders and dividers**
- ✅ **Disabled states**

#### **Use Teal (Tertiary) For:**
- ✅ **Special features** (Premium badges, highlights)
- ✅ **Success states** (alternative to green)
- ✅ **Accent elements** (variety in UI)
- ✅ **Info indicators** (tips, notifications)

---

## 📊 Visual Hierarchy

### Coral Hierarchy (Darkest to Lightest)
```
primaryDarker (#D97A5F) ← High contrast text/icons/borders
    ↓
primaryDark (#E89580) ← Emphasis, hover states
    ↓
primary (#F4B5A4) ← Main buttons, CTAs, selected chips
    ↓
primaryLight (#F8CFC3) ← Selected backgrounds, highlights
    ↓
primaryLighter (#FCE5DF) ← Subtle section backgrounds
    ↓
primarySubtle (#FEF5F2) ← Almost invisible tint, large areas
```

### Grey Hierarchy (Darkest to Lightest)
```
secondaryDark (#6B7280) ← Dark grey for emphasis
    ↓
secondary (#9CA3AF) ← Secondary buttons, neutral actions
    ↓
secondaryLight (#D1D5DB) ← Light grey borders
    ↓
secondarySubtle (#F3F4F6) ← Very light grey backgrounds
```

### Teal Hierarchy (Darkest to Lightest)
```
tertiaryDark (#2DD4BF) ← Dark teal for emphasis
    ↓
tertiary (#5EEAD4) ← Teal accents, special features
    ↓
tertiaryLight (#99F6E4) ← Light teal backgrounds
    ↓
tertiarySubtle (#CCFBF1) ← Very light teal tint
```

---

## 🎨 Real-World Examples

### Example 1: Primary Button (Coral)
```typescript
// Button background
backgroundColor: colors.primary, // #F4B5A4

// Button text
color: colors.black, // Dark text for contrast

// Button shadow
shadowColor: colors.primary, // #F4B5A4 - Coral glow
```

### Example 2: Secondary Button (Grey)
```typescript
// Button background
backgroundColor: colors.secondary, // #9CA3AF

// Button text
color: colors.white, // White text for contrast

// Button border (optional)
borderWidth: 1,
borderColor: colors.secondaryDark, // #6B7280
```

### Example 3: Active Tab (Coral)
```typescript
// Active tab background
backgroundColor: colors.primaryDarker, // #D97A5F - High contrast

// Active tab label
color: colors.white, // White text on dark coral

// Inactive tab label
color: colors.textLight, // Grey
```

### Example 4: Info Box (Teal)
```typescript
// Teal info box
backgroundColor: colors.tertiarySubtle, // #CCFBF1
borderLeftWidth: 3,
borderLeftColor: colors.tertiary, // #5EEAD4
```

### Example 5: Category Chips
```typescript
// Selected chip (coral)
backgroundColor: colors.primary, // #F4B5A4
color: colors.text, // Dark text

// Unselected chip
backgroundColor: colors.primarySubtle, // #FEF5F2
color: colors.primaryDark, // #E89580

// Alternative unselected (grey)
backgroundColor: colors.secondarySubtle, // #F3F4F6
color: colors.secondaryDark, // #6B7280
```

### Example 6: Bottom Tab Bar (Coral)
```typescript
// Active tab pill background
backgroundColor: colors.primaryDarker, // #D97A5F - High contrast coral

// Active tab icon
color: colors.white, // White on dark coral

// Inactive tab icon
color: colors.textLight, // Grey
```

### Example 7: Disabled Button
```typescript
// Disabled button
backgroundColor: colors.secondaryLight, // #D1D5DB - Light grey
color: colors.textDisabled, // #BDBDBD
opacity: 0.6,
```

---

## ✅ Design Principles

1. **Coral for All Primary Actions** - Single brand color for consistency
2. **Grey for Secondary Actions** - Neutral color for utility functions
3. **Teal for Special Features** - Accent color for variety and highlights
4. **High Contrast for Visibility** - Use `primaryDarker` (#D97A5F) for text/icons on white
5. **Light Shades for Selection** - Use `primaryLight` for selected states
6. **Subtle Shades for Backgrounds** - Use `primaryLighter` and `primarySubtle` for large areas
7. **Consistent Brand Identity** - Coral is the hero, grey and teal are supporting actors

---

## 🎯 Migration from Pink

### Old Color → New Color Mapping

| Old Pink Color | New Coral Color | Notes |
|----------------|-----------------|-------|
| `primary` (#FFD4E2) | `primary` (#F4B5A4) | Warmer, more peachy |
| `primaryDark` (#FFB3D1) | `primaryDark` (#E89580) | Richer coral tone |
| `highContrastPink` (#F48FB1) | `primaryDarker` (#D97A5F) or `highContrastCoral` | Better contrast |
| `primaryLight` (#FFE5EE) | `primaryLight` (#F8CFC3) | Softer peach tint |
| `primaryLighter` (#FFF0F5) | `primaryLighter` (#FCE5DF) | Very light coral |
| `primarySubtle` (#FFF8FB) | `primarySubtle` (#FEF5F2) | Almost white coral |
| `secondary` (grey) | `secondary` (#9CA3AF) | Unchanged - still grey |

---

## 💡 Key Benefits

✅ **Single brand color** - Consistent, focused brand identity
✅ **Clear hierarchy** - 6 coral shades for every use case
✅ **High contrast option** - `primaryDarker` solves visibility issues
✅ **Elegant & cohesive** - Warm, inviting coral/peach tone
✅ **Flexible** - Grey and teal provide variety without competing
✅ **Accessible** - High contrast shades meet WCAG standards
✅ **Professional** - Sophisticated yet approachable palette
✅ **Memorable** - Distinctive coral brand color

---

**The Coral/Peach system gives Glamora a warm, elegant, and focused brand identity that stands out while maintaining professionalism!** 💅✨🧡
```

#### **3. `secondaryDarker` (#9B7FC4) - Dark Lavender** 🟣
**Purpose:** High contrast for visibility

**Use For:**
- ✅ Text on white backgrounds (alternative to coral)
- ✅ Icons that need high visibility
- ✅ Important secondary borders
- ✅ Alternative active states
- ✅ Links and clickable text (variety)

**Example:**
```typescript
color: colors.secondaryDarker, // #9B7FC4
// OR use the alias:
color: colors.highContrastLavender, // #9B7FC4
```

