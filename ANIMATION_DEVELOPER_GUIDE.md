# Animation Developer Guide

## 🎨 Quick Start

All entrance animations are now implemented across the Glamora app! This guide shows you how to use and maintain them.

---

## 📦 Available Animation Components

### 1. FadeInView
Fades content in from transparent to opaque.

```tsx
import FadeInView from '../../components/animations/FadeInView';

<FadeInView delay={0}>
  <Text>This text fades in</Text>
</FadeInView>
```

**Props:**
- `delay?: number` - Delay before animation starts (default: 0ms)
- `duration?: number` - Animation duration (default: 250ms)
- `enabled?: boolean` - Enable/disable animation (default: true)

**Best for:** Headers, titles, tabs, text content

---

### 2. SlideUpView
Slides content up from below while fading in.

```tsx
import SlideUpView from '../../components/animations/SlideUpView';

<SlideUpView delay={100}>
  <View style={styles.card}>
    <Text>This card slides up</Text>
  </View>
</SlideUpView>
```

**Props:**
- `delay?: number` - Delay before animation starts (default: 0ms)
- `duration?: number` - Animation duration (default: 250ms)
- `distance?: number` - Distance to slide (default: 30px)
- `enabled?: boolean` - Enable/disable animation (default: true)

**Best for:** Cards, forms, sections, buttons

---

### 3. ScaleInView
Scales content from small to full size while fading in.

```tsx
import ScaleInView from '../../components/animations/ScaleInView';

<ScaleInView delay={0}>
  <View style={styles.avatar}>
    <Image source={avatarUrl} />
  </View>
</ScaleInView>
```

**Props:**
- `delay?: number` - Delay before animation starts (default: 0ms)
- `duration?: number` - Animation duration (default: 250ms)
- `initialScale?: number` - Starting scale (default: 0.8)
- `enabled?: boolean` - Enable/disable animation (default: true)

**Best for:** Profile headers, avatars, chips, icons

---

### 4. StaggeredList
Animates list items with sequential delays.

```tsx
import StaggeredList from '../../components/animations/StaggeredList';

<StaggeredList animationType="slideUp" staggerDelay={50}>
  {items.map(item => (
    <View key={item.id} style={styles.item}>
      <Text>{item.name}</Text>
    </View>
  ))}
</StaggeredList>
```

**Props:**
- `animationType?: 'fade' | 'slideUp' | 'scale'` - Type of animation (default: 'slideUp')
- `staggerDelay?: number` - Delay between items (default: 50ms)
- `maxDelay?: number` - Maximum total delay (default: 300ms)
- `enabled?: boolean` - Enable/disable animation (default: true)

**Best for:** Lists, grids, category chips, service cards

---

## 🎯 Animation Patterns

### Pattern 1: Simple Screen Header
```tsx
<FadeInView delay={0}>
  <Text style={styles.title}>Screen Title</Text>
</FadeInView>
```

### Pattern 2: Tabs/Filters
```tsx
<FadeInView delay={0}>
  <View style={styles.tabsContainer}>
    <PillTabs tabs={tabs} activeTab={activeTab} />
  </View>
</FadeInView>
```

### Pattern 3: Profile Header
```tsx
<ScaleInView delay={0}>
  <View style={styles.header}>
    <Image source={avatar} style={styles.avatar} />
    <Text style={styles.name}>{name}</Text>
  </View>
</ScaleInView>
```

### Pattern 4: Form Sections
```tsx
<SlideUpView delay={150}>
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Personal Info</Text>
    {/* Form fields */}
  </View>
</SlideUpView>
```

### Pattern 5: Card List
```tsx
<StaggeredList animationType="scale" staggerDelay={50}>
  {services.map(service => (
    <ServiceCard key={service.id} service={service} />
  ))}
</StaggeredList>
```

---

## ⏱️ Timing Guidelines

### Delays
- **0ms** - Headers, titles, first elements
- **50-100ms** - Secondary elements (tabs, filters)
- **100-200ms** - Content sections
- **200-400ms** - Action buttons, CTAs

### Durations
- **200ms** - Fast, subtle (chips, icons)
- **250ms** - Standard (most content)
- **300ms** - Slower, emphasized (headers)
- **350ms** - Maximum (special cases)

### Stagger
- **50ms** - Standard list items
- **100ms** - Larger cards
- **300ms** - Maximum total delay cap

---

## ✅ Best Practices

### DO ✅
- Use `useNativeDriver: true` (already built-in)
- Keep animations under 500ms
- Use consistent timing across similar elements
- Test with "Reduce Motion" enabled
- Wrap only necessary elements
- Use appropriate animation types

### DON'T ❌
- Animate layout properties (width, height, padding)
- Create overly long animations (>500ms)
- Nest multiple animation wrappers
- Animate every single element
- Forget to test on physical devices
- Ignore accessibility settings

---

## 🔧 Customization

### Custom Delays
```tsx
<FadeInView delay={200}>
  <Text>Delayed content</Text>
</FadeInView>
```

### Custom Duration
```tsx
<SlideUpView duration={300}>
  <Text>Slower animation</Text>
</SlideUpView>
```

### Disable Animation
```tsx
<ScaleInView enabled={false}>
  <Text>No animation</Text>
</ScaleInView>
```

---

## 🎨 Animation Constants

All timing constants are in `src/constants/theme.ts`:

```typescript
animation: {
  entrance: {
    fadeInDuration: 250,
    slideUpDuration: 250,
    slideUpDistance: 30,
    scaleInDuration: 250,
    scaleInInitial: 0.8,
    staggerDelay: 50,
    maxStaggerDelay: 300,
  }
}
```

---

## 🐛 Troubleshooting

### Animation not working?
1. Check import path is correct
2. Verify component is wrapped properly
3. Check `enabled` prop isn't false
4. Test on device (not just simulator)

### Performance issues?
1. Reduce number of animated items
2. Use `removeClippedSubviews` for long lists
3. Check for nested animations
4. Profile with React Native Performance Monitor

### Accessibility issues?
1. Test with "Reduce Motion" enabled
2. Verify animations don't convey critical info
3. Test with screen readers

---

## 📚 Examples in Codebase

Check these files for reference:
- `src/screens/auth/WelcomeScreen.tsx` - Multiple animation types
- `src/screens/customer/ProfileScreen.tsx` - Scale + slide patterns
- `src/screens/provider/ServicesScreen.tsx` - Staggered list
- `src/screens/onboarding/PersonalizationScreen.tsx` - Complex multi-step

---

## 🚀 Adding Animations to New Screens

1. Import animation components
2. Wrap key UI sections
3. Use appropriate delays (0, 100, 150, 200ms)
4. Test on device
5. Verify accessibility

That's it! The animation system is designed to be simple and consistent. 🎉

