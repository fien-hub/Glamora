let ExpoHaptics: typeof import('expo-haptics') | null = null;
try { ExpoHaptics = require('expo-haptics'); } catch (e) { console.warn('[haptics] expo-haptics unavailable:', e); }

export const ImpactFeedbackStyle = {
  Light: 'light' as const,
  Medium: 'medium' as const,
  Heavy: 'heavy' as const,
};

export const NotificationFeedbackType = {
  Success: 'success' as const,
  Warning: 'warning' as const,
  Error: 'error' as const,
};

export const impactAsync = async (style?: any): Promise<void> => {
  try {
    if (ExpoHaptics?.impactAsync) {
      // Always use the real enum from the native module — never pass our string shim
      const realStyle = ExpoHaptics.ImpactFeedbackStyle?.Light !== undefined
        ? (style === ImpactFeedbackStyle.Heavy
            ? ExpoHaptics.ImpactFeedbackStyle.Heavy
            : style === ImpactFeedbackStyle.Medium
            ? ExpoHaptics.ImpactFeedbackStyle.Medium
            : ExpoHaptics.ImpactFeedbackStyle.Light)
        : undefined;
      await ExpoHaptics.impactAsync(realStyle as any);
    }
  } catch (_) {}
};

export const notificationAsync = async (type?: any): Promise<void> => {
  try {
    if (ExpoHaptics?.notificationAsync) {
      const realType = ExpoHaptics.NotificationFeedbackType?.Success !== undefined
        ? (type === NotificationFeedbackType.Error
            ? ExpoHaptics.NotificationFeedbackType.Error
            : type === NotificationFeedbackType.Warning
            ? ExpoHaptics.NotificationFeedbackType.Warning
            : ExpoHaptics.NotificationFeedbackType.Success)
        : undefined;
      await ExpoHaptics.notificationAsync(realType as any);
    }
  } catch (_) {}
};

export const selectionAsync = async (): Promise<void> => {
  try {
    if (ExpoHaptics?.selectionAsync) {
      await ExpoHaptics.selectionAsync();
    }
  } catch (_) {}
};

const Haptics = { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType };
export default Haptics;
