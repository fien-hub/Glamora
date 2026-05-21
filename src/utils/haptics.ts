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
      await ExpoHaptics.impactAsync(style ?? ExpoHaptics.ImpactFeedbackStyle?.Light);
    }
  } catch (_) {}
};

export const notificationAsync = async (type?: any): Promise<void> => {
  try {
    if (ExpoHaptics?.notificationAsync) {
      await ExpoHaptics.notificationAsync(type ?? ExpoHaptics.NotificationFeedbackType?.Success);
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
