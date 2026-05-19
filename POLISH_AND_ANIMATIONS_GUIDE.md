# Polish & Animations Guide for Glamora

## 📋 Overview

This guide covers adding polish, animations, and micro-interactions to make Glamora feel premium.

## 🎨 Animation Libraries

### Install Reanimated

```bash
cd glamora-app
npx expo install react-native-reanimated
```

Add to `babel.config.js`:

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'],
};
```

## ✨ Common Animations

### 1. Fade In Animation

```typescript
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

<Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
  <Text>Content</Text>
</Animated.View>
```

### 2. Slide In Animation

```typescript
import { SlideInRight, SlideOutLeft } from 'react-native-reanimated';

<Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
  <Text>Content</Text>
</Animated.View>
```

### 3. Scale Animation (Button Press)

```typescript
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function AnimatedButton({ onPress, children }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
```

### 4. Skeleton Loading

```typescript
import { useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

function SkeletonLoader() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.skeleton, animatedStyle]} />
  );
}
```

### 5. Pull to Refresh

```typescript
import { RefreshControl } from 'react-native';

<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  }
>
  {/* Content */}
</ScrollView>
```

### 6. Swipe to Delete

```typescript
import { Swipeable } from 'react-native-gesture-handler';

function SwipeableItem({ item, onDelete }) {
  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.item}>
        <Text>{item.name}</Text>
      </View>
    </Swipeable>
  );
}
```

## 🎯 Micro-Interactions

### 1. Haptic Feedback

```typescript
import * as Haptics from 'expo-haptics';

// Light tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

### 2. Button with Haptic

```typescript
function HapticButton({ onPress, children }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      {children}
    </TouchableOpacity>
  );
}
```

### 3. Success Animation

```typescript
import LottieView from 'lottie-react-native';

function SuccessAnimation() {
  return (
    <LottieView
      source={require('../assets/success.json')}
      autoPlay
      loop={false}
      style={{ width: 200, height: 200 }}
    />
  );
}
```

## 🎨 Polish Details

### 1. Loading States

```typescript
function LoadingButton({ loading, onPress, title }) {
  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
```

### 2. Empty States

```typescript
function EmptyState({ icon, title, description, action }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action && (
        <TouchableOpacity style={styles.emptyButton} onPress={action.onPress}>
          <Text style={styles.emptyButtonText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### 3. Toast Notifications

```typescript
import Toast from 'react-native-toast-message';

// Show success toast
Toast.show({
  type: 'success',
  text1: 'Success!',
  text2: 'Your changes have been saved',
  position: 'top',
  visibilityTime: 3000,
});

// Show error toast
Toast.show({
  type: 'error',
  text1: 'Error',
  text2: 'Something went wrong',
});
```

### 4. Bottom Sheet

```typescript
import { BottomSheetModal } from '@gorhom/bottom-sheet';

function MyScreen() {
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  return (
    <>
      <Button onPress={() => bottomSheetRef.current?.present()}>
        Open Sheet
      </Button>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['25%', '50%', '75%']}
      >
        <View style={styles.sheetContent}>
          <Text>Bottom Sheet Content</Text>
        </View>
      </BottomSheetModal>
    </>
  );
}
```

## 🎬 Screen Transitions

### Custom Screen Transition

```typescript
// In navigation config
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  options={{
    animation: 'slide_from_right',
    animationDuration: 300,
  }}
/>
```

## ✅ Polish Checklist

### Visual Polish
- [ ] Add loading states to all buttons
- [ ] Add skeleton loaders for content
- [ ] Add empty states for all lists
- [ ] Add error states with retry buttons
- [ ] Add success animations for actions
- [ ] Add smooth transitions between screens
- [ ] Add pull-to-refresh on all lists
- [ ] Add swipe gestures where appropriate

### Interaction Polish
- [ ] Add haptic feedback to buttons
- [ ] Add press animations to touchable elements
- [ ] Add toast notifications for feedback
- [ ] Add confirmation dialogs for destructive actions
- [ ] Add loading indicators for async operations
- [ ] Add keyboard avoiding view for forms
- [ ] Add auto-focus on text inputs
- [ ] Add input validation with error messages

### Performance Polish
- [ ] Add image placeholders
- [ ] Add lazy loading for images
- [ ] Add pagination for long lists
- [ ] Add debouncing for search inputs
- [ ] Add optimistic updates for better UX
- [ ] Add offline support with caching
- [ ] Add retry logic for failed requests

### Accessibility Polish
- [ ] Add accessibility labels
- [ ] Add screen reader support
- [ ] Add sufficient color contrast
- [ ] Add touch target sizes (min 44x44)
- [ ] Add keyboard navigation
- [ ] Add focus indicators
- [ ] Test with VoiceOver/TalkBack

## 📦 Recommended Packages

```bash
# Animations
npm install react-native-reanimated
npm install lottie-react-native

# Gestures
npm install react-native-gesture-handler

# UI Components
npm install @gorhom/bottom-sheet
npm install react-native-toast-message

# Haptics
npx expo install expo-haptics

# Icons
npm install @expo/vector-icons
```

## 🎯 Premium Feel Checklist

- [ ] Smooth 60 FPS animations
- [ ] Consistent spacing and alignment
- [ ] Proper loading states everywhere
- [ ] Haptic feedback on interactions
- [ ] Toast notifications for feedback
- [ ] Empty states with helpful messages
- [ ] Error handling with retry options
- [ ] Skeleton loaders for content
- [ ] Pull-to-refresh on lists
- [ ] Swipe gestures where appropriate
- [ ] Bottom sheets for actions
- [ ] Confirmation dialogs
- [ ] Success animations
- [ ] Smooth screen transitions

## 📞 Resources

- **Reanimated Docs**: [docs.swmansion.com/react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Gesture Handler**: [docs.swmansion.com/react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/)
- **Lottie Files**: [lottiefiles.com](https://lottiefiles.com/)

