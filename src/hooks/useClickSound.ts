import { useCallback } from 'react';
import { soundService } from '../services/soundService';

/**
 * Hook that wraps an onPress handler with click sound
 * 
 * Usage:
 * const handlePress = useClickSound(() => {
 *   // your logic
 * });
 * 
 * <TouchableOpacity onPress={handlePress}>...</TouchableOpacity>
 */
export const useClickSound = (callback?: () => void | Promise<void>, enabled: boolean = true) => {
  return useCallback(async () => {
    if (enabled) {
      await soundService.playClick();
    }
    if (callback) {
      await callback();
    }
  }, [callback, enabled]);
};
