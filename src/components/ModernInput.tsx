import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface ModernInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

const ModernInput = React.forwardRef<TextInput, ModernInputProps>(({
  label,
  value,
  onChangeText,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  hint,
  required,
  containerStyle,
  ...textInputProps
}: ModernInputProps, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const isSecureInput = Boolean(textInputProps.secureTextEntry);
  const resolvedAutoComplete = textInputProps.autoComplete ?? (isSecureInput ? undefined : 'off');
  const resolvedTextContentType = textInputProps.textContentType
    ?? (Platform.OS === 'ios' && !isSecureInput ? 'oneTimeCode' : undefined);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    Animated.timing(borderColorAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [18, -10],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.textSecondary, isFocused ? colors.primary : colors.textSecondary],
    }),
  };

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#EF4444' : colors.border, error ? '#EF4444' : colors.primary],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor },
          error && styles.inputError,
        ]}
      >
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon as any}
              size={20}
              color={isFocused ? colors.primary : colors.textSecondary}
            />
          </View>
        )}

        <View style={styles.inputWrapper}>
          <Animated.Text style={[styles.label, labelStyle]} pointerEvents="none">
            {label}{required && ' *'}
          </Animated.Text>
          <TextInput
            ref={ref}
            style={[styles.input, !!icon && styles.inputWithIcon]}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor="transparent"
            autoComplete={resolvedAutoComplete}
            textContentType={resolvedTextContentType}
            {...textInputProps}
          />
        </View>

        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconContainer}>
            <Ionicons
              name={rightIcon as any}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {hint && !error && (
        <Text style={styles.hintText}>{hint}</Text>
      )}
    </View>
  );
});

ModernInput.displayName = 'ModernInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    zIndex: 1,
  },
  input: {
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.lg, // increase for better touch area
    paddingTop: spacing.xl, // extra space for floating label
    minHeight: 48, // ensure minimum touchable height
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  rightIconContainer: {
    padding: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: '#EF4444',
    marginLeft: spacing.xs,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});

export default ModernInput;

