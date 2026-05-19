# Animation Quick Reference Card

## 🎨 When to Use Which Animation

| Element Type | Animation | Duration | Delay Pattern |
|--------------|-----------|----------|---------------|
| **Headers/Titles** | Fade-in | 250ms | 0ms |
| **Body Text** | Fade-in | 250ms | 50-100ms |
| **Buttons** | Slide-up | 250ms | 100-200ms |
| **Form Fields** | Slide-up | 250ms | Stagger 50ms |
| **Cards (Large)** | Slide-up | 300ms | Stagger 100ms |
| **Cards (Small)** | Scale-in | 250ms | Stagger 50ms |
| **Chips/Tags** | Scale-in | 200ms | Stagger 50ms |
| **List Items** | Slide-up | 250ms | Stagger 50ms (max 300ms) |
| **Grid Items** | Scale-in | 250ms | Stagger 50ms (max 300ms) |
| **Modals** | Fade + Scale | 300ms | 0ms |
| **Tab Bars** | Slide-up | 300ms | 0ms |
| **Headers** | Fade + Slide-down | 250ms | 0ms |

## 📦 Import Statements

```typescript
// Animation components
import FadeInView from '../components/animations/FadeInView';
import SlideUpView from '../components/animations/SlideUpView';
import ScaleInView from '../components/animations/ScaleInView';
import StaggeredList from '../components/animations/StaggeredList';

// Animation hook
import { useEntranceAnimation } from '../hooks/useEntranceAnimation';

// Theme constants
import { animation } from '../constants/theme';
```

## 🚀 Common Patterns

### Pattern 1: Simple Screen

```typescript
<View>
  <FadeInView>
    <Text>Header</Text>
  </FadeInView>
  
  <SlideUpView delay={100}>
    <Content />
  </SlideUpView>
</View>
```

### Pattern 2: Form with Staggered Fields

```typescript
<View>
  <FadeInView>
    <Text>Login</Text>
  </FadeInView>
  
  <SlideUpView delay={100}>
    <TextInput placeholder="Email" />
  </SlideUpView>
  
  <SlideUpView delay={150}>
    <TextInput placeholder="Password" />
  </SlideUpView>
  
  <SlideUpView delay={200}>
    <Button title="Submit" />
  </SlideUpView>
</View>
```

### Pattern 3: Card Grid

```typescript
<View style={styles.grid}>
  {items.map((item, index) => (
    <ScaleInView key={item.id} delay={Math.min(index * 50, 300)}>
      <Card item={item} />
    </ScaleInView>
  ))}
</View>
```

### Pattern 4: List with Stagger

```typescript
<StaggeredList staggerDelay={50} maxDelay={300}>
  {items.map(item => (
    <ListItem key={item.id} item={item} />
  ))}
</StaggeredList>
```

## ⚡ Performance Checklist

- [ ] Using `useNativeDriver: true`?
- [ ] Animating only `opacity` and `transform`?
- [ ] Capping stagger delays at 300ms?
- [ ] Cleaning up animations on unmount?
- [ ] Testing on physical devices?
- [ ] Respecting reduced motion preferences?

## 🎯 Animation Timing Reference

```typescript
// From theme.ts
animation.duration.fast = 150ms      // Quick, subtle
animation.duration.normal = 250ms    // Standard (most common)
animation.duration.slow = 350ms      // Dramatic
animation.duration.slower = 500ms    // Special cases only

animation.delay.short = 50ms         // List item stagger
animation.delay.medium = 100ms       // Section stagger
animation.delay.long = 150ms         // Major element stagger
```

## 🔧 Customization Props

### FadeInView
```typescript
<FadeInView
  delay={100}           // Delay before animation starts
  duration={250}        // Animation duration
  style={styles.custom} // Additional styles
>
```

### SlideUpView
```typescript
<SlideUpView
  delay={100}           // Delay before animation starts
  duration={250}        // Animation duration
  distance={30}         // Slide distance in pixels
  style={styles.custom} // Additional styles
>
```

### ScaleInView
```typescript
<ScaleInView
  delay={100}           // Delay before animation starts
  duration={250}        // Animation duration
  initialScale={0.8}    // Starting scale (0.0 to 1.0)
  style={styles.custom} // Additional styles
>
```

### StaggeredList
```typescript
<StaggeredList
  staggerDelay={50}     // Delay between items
  maxDelay={300}        // Maximum total delay
  style={styles.custom} // Additional styles
>
```

## 🎨 Screen-Specific Recommendations

### Auth Screens
- Logo: Fade-in (0ms)
- Form fields: Slide-up with 50ms stagger
- Buttons: Slide-up (last)
- Links: Fade-in (last)

### Home/Dashboard
- Header: Fade-in (0ms)
- Search bar: Slide-up (100ms)
- Categories: Scale-in with 50ms stagger
- Content sections: Slide-up with 100ms stagger

### List Screens
- Header: Fade-in (0ms)
- Filters/Tabs: Slide-up (100ms)
- List items: Slide-up with 50ms stagger (max 300ms)

### Detail Screens
- Hero image: Fade-in (0ms)
- Title: Fade-in (50ms)
- Content: Slide-up (100ms)
- Action buttons: Slide-up (150ms)

### Settings Screens
- Header: Fade-in (0ms)
- Sections: Slide-up with 100ms stagger
- Toggle items: Slide-up with 50ms stagger

## ⚠️ Common Mistakes

### ❌ Don't
```typescript
// Animating layout properties
<Animated.View style={{ width: animValue }}>

// Forgetting useNativeDriver
Animated.timing(value, { useNativeDriver: false })

// Too many concurrent animations
{items.map((item, i) => <SlideUpView delay={i * 50}>)} // 100+ items

// No cleanup
useEffect(() => {
  animation.start();
  // Missing return cleanup
});
```

### ✅ Do
```typescript
// Use transform and opacity
<Animated.View style={{ opacity: animValue, transform: [...] }}>

// Always use native driver
Animated.timing(value, { useNativeDriver: true })

// Cap delays
{items.map((item, i) => <SlideUpView delay={Math.min(i * 50, 300)}>)}

// Clean up
useEffect(() => {
  animation.start();
  return () => animation.stop();
});
```

## 📱 Testing Commands

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Enable Performance Monitor
# In simulator: Cmd+D (iOS) or Cmd+M (Android)
# Select "Show Perf Monitor"

# Enable Slow Animations
# iOS: Settings > Accessibility > Motion > Slow Animations
# Android: Settings > Developer Options > Animator Duration Scale (10x)
```

## 🔗 Related Files

- `glamora-app/ENTRANCE_ANIMATIONS_PLAN.md` - Complete implementation plan
- `glamora-app/ANIMATION_IMPLEMENTATION_GUIDE.md` - Detailed code examples
- `glamora-app/src/constants/theme.ts` - Animation constants
- `glamora-app/src/hooks/useEntranceAnimation.ts` - Animation hook
- `glamora-app/src/components/animations/` - Animation components

