# Accessibility Guide for Glamora

## 📋 Overview

Making Glamora accessible ensures all users, including those with disabilities, can use the app effectively.

## 🎯 WCAG 2.1 Guidelines

We aim for **WCAG 2.1 Level AA** compliance:
- **Perceivable**: Information must be presentable to users
- **Operable**: UI components must be operable
- **Understandable**: Information and UI must be understandable
- **Robust**: Content must work with assistive technologies

## 🔊 Screen Reader Support

### Add Accessibility Labels

```typescript
// ✅ Good - descriptive label
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Book appointment with Sarah Johnson"
  accessibilityHint="Double tap to view booking details"
  onPress={handlePress}
>
  <Text>Book Now</Text>
</TouchableOpacity>

// ❌ Bad - no label
<TouchableOpacity onPress={handlePress}>
  <Text>Book Now</Text>
</TouchableOpacity>
```

### Accessibility Roles

```typescript
<View accessibilityRole="button">
  <Text>Submit</Text>
</View>

<View accessibilityRole="header">
  <Text>Welcome to Glamora</Text>
</View>

<View accessibilityRole="link">
  <Text>Learn More</Text>
</View>

<View accessibilityRole="alert">
  <Text>Error: Please fill all fields</Text>
</View>
```

### Accessibility States

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Favorite"
  accessibilityState={{
    selected: isFavorite,
    disabled: isLoading,
  }}
  onPress={toggleFavorite}
>
  <Icon name={isFavorite ? 'heart' : 'heart-outline'} />
</TouchableOpacity>
```

### Hide Decorative Elements

```typescript
// Hide decorative images from screen readers
<Image
  source={require('./decoration.png')}
  accessibilityElementsHidden={true}
  importantForAccessibility="no"
/>
```

### Group Related Elements

```typescript
<View
  accessible={true}
  accessibilityLabel="Booking for Haircut on March 15th at 2 PM with Sarah Johnson"
>
  <Text>Haircut</Text>
  <Text>March 15, 2024</Text>
  <Text>2:00 PM</Text>
  <Text>Sarah Johnson</Text>
</View>
```

## 🎨 Visual Accessibility

### Color Contrast

Ensure minimum contrast ratios:
- **Normal text**: 4.5:1
- **Large text** (18pt+): 3:1
- **UI components**: 3:1

```typescript
// ✅ Good contrast
const styles = StyleSheet.create({
  text: {
    color: '#000000', // Black text
    backgroundColor: '#FFFFFF', // White background
    // Contrast ratio: 21:1
  },
});

// ❌ Poor contrast
const styles = StyleSheet.create({
  text: {
    color: '#CCCCCC', // Light gray text
    backgroundColor: '#FFFFFF', // White background
    // Contrast ratio: 1.6:1 (fails WCAG)
  },
});
```

### Don't Rely on Color Alone

```typescript
// ✅ Good - uses icon + color
<View style={[styles.status, { backgroundColor: colors.success }]}>
  <Icon name="checkmark" />
  <Text>Confirmed</Text>
</View>

// ❌ Bad - color only
<View style={{ backgroundColor: 'green' }}>
  <Text>Confirmed</Text>
</View>
```

### Text Sizing

Support dynamic text sizing:

```typescript
import { useWindowDimensions, PixelRatio } from 'react-native';

function useScaledFontSize(size: number) {
  const { fontScale } = useWindowDimensions();
  return size * fontScale;
}

// Usage
const styles = StyleSheet.create({
  text: {
    fontSize: useScaledFontSize(16),
  },
});
```

## 👆 Touch Targets

### Minimum Size

All touch targets should be **at least 44x44 points**:

```typescript
const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Increase Hit Area

```typescript
<TouchableOpacity
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  onPress={handlePress}
>
  <Icon name="close" size={20} />
</TouchableOpacity>
```

## ⌨️ Keyboard Navigation

### Focus Management

```typescript
import { useRef } from 'react';

function LoginForm() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  return (
    <>
      <TextInput
        ref={emailRef}
        placeholder="Email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextInput
        ref={passwordRef}
        placeholder="Password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
    </>
  );
}
```

### Keyboard Avoiding View

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <TextInput placeholder="Enter text" />
</KeyboardAvoidingView>
```

## 🔊 Audio & Video

### Captions

Provide captions for video content:

```typescript
<Video
  source={{ uri: videoUrl }}
  textTracks={[
    {
      title: 'English',
      language: 'en',
      type: 'text/vtt',
      uri: captionsUrl,
    },
  ]}
/>
```

### Audio Descriptions

Provide audio descriptions for important visual content.

## 📱 Platform-Specific

### iOS VoiceOver

Test with VoiceOver:
1. Settings → Accessibility → VoiceOver → On
2. Triple-click home button to toggle

### Android TalkBack

Test with TalkBack:
1. Settings → Accessibility → TalkBack → On
2. Volume keys to toggle

## ✅ Accessibility Checklist

### Screen Reader Support
- [ ] All interactive elements have accessibility labels
- [ ] Accessibility hints provide context
- [ ] Proper accessibility roles assigned
- [ ] Decorative elements hidden from screen readers
- [ ] Related elements grouped logically
- [ ] Dynamic content announces changes
- [ ] Form errors announced clearly

### Visual Accessibility
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Don't rely on color alone
- [ ] Support dynamic text sizing
- [ ] Clear focus indicators
- [ ] Readable font sizes (minimum 16px)
- [ ] Proper heading hierarchy

### Touch & Interaction
- [ ] Touch targets minimum 44x44 points
- [ ] Sufficient spacing between elements
- [ ] Gestures have alternatives
- [ ] No time-based interactions (or adjustable)
- [ ] Haptic feedback for important actions

### Keyboard & Input
- [ ] Logical tab order
- [ ] Focus management in forms
- [ ] Keyboard avoiding view implemented
- [ ] Return key types set appropriately
- [ ] Auto-focus on important fields

### Content
- [ ] Clear, simple language
- [ ] Error messages are descriptive
- [ ] Instructions are clear
- [ ] Loading states announced
- [ ] Success/error feedback provided

### Testing
- [ ] Test with VoiceOver (iOS)
- [ ] Test with TalkBack (Android)
- [ ] Test with large text sizes
- [ ] Test with reduced motion
- [ ] Test with high contrast mode
- [ ] Test keyboard navigation
- [ ] Test with color blindness simulator

## 🛠️ Testing Tools

### React Native Accessibility Inspector

```typescript
import { AccessibilityInfo } from 'react-native';

// Check if screen reader is enabled
AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
  console.log('Screen reader enabled:', enabled);
});

// Listen for screen reader changes
AccessibilityInfo.addEventListener('screenReaderChanged', enabled => {
  console.log('Screen reader changed:', enabled);
});
```

### Color Contrast Checker

Use online tools:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)

### Accessibility Linter

```bash
npm install --save-dev eslint-plugin-react-native-a11y
```

Add to `.eslintrc.js`:

```javascript
{
  "plugins": ["react-native-a11y"],
  "extends": ["plugin:react-native-a11y/all"]
}
```

## 📊 Common Patterns

### Accessible Button

```typescript
function AccessibleButton({ label, hint, onPress, disabled }) {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={styles.button}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}
```

### Accessible Form Field

```typescript
function AccessibleInput({ label, error, ...props }) {
  return (
    <View>
      <Text accessibilityRole="text">{label}</Text>
      <TextInput
        accessible={true}
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        accessibilityState={{ disabled: props.disabled }}
        {...props}
      />
      {error && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.error}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
```

## 📞 Resources

- **React Native A11y**: [reactnative.dev/docs/accessibility](https://reactnative.dev/docs/accessibility)
- **WCAG Guidelines**: [w3.org/WAI/WCAG21/quickref](https://www.w3.org/WAI/WCAG21/quickref/)
- **Apple Accessibility**: [developer.apple.com/accessibility](https://developer.apple.com/accessibility/)
- **Android Accessibility**: [developer.android.com/guide/topics/ui/accessibility](https://developer.android.com/guide/topics/ui/accessibility)

