# Animation Implementation Guide

## 🎯 Quick Start

This guide provides code examples for implementing entrance animations throughout the Glamora app.

## 📦 Step 1: Create Animation Hook

Create `glamora-app/src/hooks/useEntranceAnimation.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { animation } from '../constants/theme';

interface EntranceAnimationConfig {
  type: 'fade' | 'slideUp' | 'scale';
  duration?: number;
  delay?: number;
  distance?: number; // For slideUp
  initialScale?: number; // For scale
}

export function useEntranceAnimation(config: EntranceAnimationConfig) {
  const {
    type,
    duration = animation.duration.normal,
    delay = 0,
    distance = 30,
    initialScale = 0.8,
  } = config;

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();

    return () => {
      animatedValue.setValue(0);
    };
  }, []);

  if (type === 'fade') {
    return {
      opacity: animatedValue,
    };
  }

  if (type === 'slideUp') {
    return {
      opacity: animatedValue,
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    };
  }

  if (type === 'scale') {
    return {
      opacity: animatedValue,
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [initialScale, 1],
          }),
        },
      ],
    };
  }

  return {};
}
```

## 📦 Step 2: Create Reusable Components

### FadeInView Component

Create `glamora-app/src/components/animations/FadeInView.tsx`:

```typescript
import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export default function FadeInView({ children, delay, duration, style }: FadeInViewProps) {
  const animatedStyle = useEntranceAnimation({ type: 'fade', delay, duration });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
```

### SlideUpView Component

Create `glamora-app/src/components/animations/SlideUpView.tsx`:

```typescript
import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

interface SlideUpViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: ViewStyle;
}

export default function SlideUpView({
  children,
  delay,
  duration,
  distance,
  style,
}: SlideUpViewProps) {
  const animatedStyle = useEntranceAnimation({ type: 'slideUp', delay, duration, distance });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
```

### ScaleInView Component

Create `glamora-app/src/components/animations/ScaleInView.tsx`:

```typescript
import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

interface ScaleInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  initialScale?: number;
  style?: ViewStyle;
}

export default function ScaleInView({
  children,
  delay,
  duration,
  initialScale,
  style,
}: ScaleInViewProps) {
  const animatedStyle = useEntranceAnimation({ type: 'scale', delay, duration, initialScale });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
```

### StaggeredList Component

Create `glamora-app/src/components/animations/StaggeredList.tsx`:

```typescript
import React from 'react';
import { View, ViewStyle } from 'react-native';
import SlideUpView from './SlideUpView';
import { animation } from '../../constants/theme';

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  maxDelay?: number;
  style?: ViewStyle;
}

export default function StaggeredList({
  children,
  staggerDelay = animation.delay.short,
  maxDelay = 300,
  style,
}: StaggeredListProps) {
  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => {
        const delay = Math.min(index * staggerDelay, maxDelay);
        return (
          <SlideUpView key={index} delay={delay}>
            {child}
          </SlideUpView>
        );
      })}
    </View>
  );
}
```

## 🎨 Usage Examples

### Example 1: Simple Fade-In

```typescript
import FadeInView from '../components/animations/FadeInView';

function MyScreen() {
  return (
    <FadeInView>
      <Text>This text fades in</Text>
    </FadeInView>
  );
}
```

### Example 2: Slide-Up with Delay

```typescript
import SlideUpView from '../components/animations/SlideUpView';

function MyScreen() {
  return (
    <>
      <SlideUpView delay={0}>
        <Text>First element</Text>
      </SlideUpView>
      <SlideUpView delay={100}>
        <Text>Second element (100ms later)</Text>
      </SlideUpView>
    </>
  );
}
```

### Example 3: Scale-In Cards

```typescript
import ScaleInView from '../components/animations/ScaleInView';

function MyScreen() {
  return (
    <View style={styles.grid}>
      {providers.map((provider, index) => (
        <ScaleInView key={provider.id} delay={index * 50}>
          <ProviderCard provider={provider} />
        </ScaleInView>
      ))}
    </View>
  );
}
```

### Example 4: Staggered List

```typescript
import StaggeredList from '../components/animations/StaggeredList';

function MyScreen() {
  return (
    <StaggeredList staggerDelay={50}>
      <MenuItem title="Profile" />
      <MenuItem title="Settings" />
      <MenuItem title="Help" />
      <MenuItem title="Logout" />
    </StaggeredList>
  );
}
```

### Example 5: Complex Screen with Multiple Animations

```typescript
import FadeInView from '../components/animations/FadeInView';
import SlideUpView from '../components/animations/SlideUpView';
import ScaleInView from '../components/animations/ScaleInView';

function HomeScreen() {
  return (
    <ScrollView>
      {/* Header fades in */}
      <FadeInView>
        <Text style={styles.header}>Welcome to Glamora</Text>
      </FadeInView>

      {/* Search bar slides up */}
      <SlideUpView delay={100}>
        <SearchBar />
      </SlideUpView>

      {/* Category chips scale in with stagger */}
      <View style={styles.categories}>
        {categories.map((category, index) => (
          <ScaleInView key={category.id} delay={200 + index * 50}>
            <CategoryChip category={category} />
          </ScaleInView>
        ))}
      </View>

      {/* Featured providers slide up */}
      <SlideUpView delay={400}>
        <FeaturedProviders />
      </SlideUpView>
    </ScrollView>
  );
}
```

## 🔧 Advanced Patterns

### Pattern 1: Conditional Animation (Respect Reduced Motion)

```typescript
import { AccessibilityInfo } from 'react-native';
import { useState, useEffect } from 'react';

function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  return reduceMotion;
}

// Usage
function MyScreen() {
  const reduceMotion = useReducedMotion();

  return (
    <SlideUpView duration={reduceMotion ? 0 : 250}>
      <Text>Content</Text>
    </SlideUpView>
  );
}
```

### Pattern 2: Animation with Cleanup

```typescript
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

function MyComponent() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    });

    animation.start();

    // Cleanup on unmount
    return () => {
      animation.stop();
      fadeAnim.setValue(0);
    };
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text>Content</Text>
    </Animated.View>
  );
}
```

### Pattern 3: Sequential Animations

```typescript
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

function MyComponent() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      // First fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Then slide up
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Text>Content</Text>
    </Animated.View>
  );
}
```

### Pattern 4: Parallel Animations

```typescript
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

function MyComponent() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Text>Content</Text>
    </Animated.View>
  );
}
```

## 📱 Screen-Specific Examples

### Auth Screen Example (LoginScreen)

```typescript
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import FadeInView from '../components/animations/FadeInView';
import SlideUpView from '../components/animations/SlideUpView';
import AnimatedButton from '../components/AnimatedButton';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      {/* Logo fades in */}
      <FadeInView style={styles.logoContainer}>
        <Text style={styles.logo}>Glamora</Text>
      </FadeInView>

      {/* Form slides up with stagger */}
      <SlideUpView delay={100}>
        <TextInput placeholder="Email" style={styles.input} />
      </SlideUpView>

      <SlideUpView delay={150}>
        <TextInput placeholder="Password" secureTextEntry style={styles.input} />
      </SlideUpView>

      <SlideUpView delay={200}>
        <AnimatedButton title="Login" onPress={() => {}} />
      </SlideUpView>

      <SlideUpView delay={250}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </SlideUpView>
    </View>
  );
}
```

### Home Screen Example (Customer HomeScreen)

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import FadeInView from '../components/animations/FadeInView';
import SlideUpView from '../components/animations/SlideUpView';
import ScaleInView from '../components/animations/ScaleInView';
import StaggeredList from '../components/animations/StaggeredList';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Header fades in */}
      <FadeInView>
        <Text style={styles.greeting}>Good morning, Sarah!</Text>
      </FadeInView>

      {/* Search bar slides up */}
      <SlideUpView delay={100}>
        <SearchBar />
      </SlideUpView>

      {/* Categories with staggered scale-in */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categories}>
          {categories.map((category, index) => (
            <ScaleInView key={category.id} delay={200 + index * 50}>
              <CategoryChip category={category} />
            </ScaleInView>
          ))}
        </View>
      </View>

      {/* Featured providers slide up */}
      <SlideUpView delay={400}>
        <Text style={styles.sectionTitle}>Featured Providers</Text>
        <FeaturedProvidersList />
      </SlideUpView>

      {/* Services slide up */}
      <SlideUpView delay={500}>
        <Text style={styles.sectionTitle}>Popular Services</Text>
        <ServicesList />
      </SlideUpView>
    </ScrollView>
  );
}
```

## ⚠️ Common Pitfalls

### ❌ Don't: Animate Layout Properties

```typescript
// BAD - Will cause performance issues
<Animated.View style={{ width: animatedValue }}>
```

### ✅ Do: Use Transform and Opacity

```typescript
// GOOD - Uses native driver
<Animated.View style={{ opacity: animatedValue, transform: [{ scale: scaleValue }] }}>
```

### ❌ Don't: Forget useNativeDriver

```typescript
// BAD - Runs on JS thread
Animated.timing(value, {
  toValue: 1,
  duration: 250,
  useNativeDriver: false, // ❌
});
```

### ✅ Do: Always Use useNativeDriver

```typescript
// GOOD - Runs on native thread
Animated.timing(value, {
  toValue: 1,
  duration: 250,
  useNativeDriver: true, // ✅
});
```

### ❌ Don't: Animate Too Many Items at Once

```typescript
// BAD - 100 items animating simultaneously
{items.map((item, index) => (
  <SlideUpView key={item.id} delay={index * 50}>
    <ItemCard item={item} />
  </SlideUpView>
))}
```

### ✅ Do: Cap Stagger Delay

```typescript
// GOOD - Cap at 300ms max delay
{items.map((item, index) => (
  <SlideUpView key={item.id} delay={Math.min(index * 50, 300)}>
    <ItemCard item={item} />
  </SlideUpView>
))}
```

## 🎯 Best Practices

1. **Keep animations short** (150-350ms)
2. **Use stagger delays** for lists (50-100ms between items)
3. **Cap maximum delays** at 300-500ms
4. **Always use useNativeDriver** for transform/opacity
5. **Respect reduced motion** preferences
6. **Clean up animations** on unmount
7. **Test on real devices** not just simulators
8. **Profile performance** regularly
9. **Use spring animations** for natural feel
10. **Don't overdo it** - subtle is better

## 📚 Next Steps

1. Implement the animation infrastructure (Phase 1)
2. Test with a single screen
3. Roll out to auth screens (Phase 2)
4. Continue through remaining phases
5. Test and optimize continuously

For the complete task list, see `ENTRANCE_ANIMATIONS_PLAN.md`.
```

