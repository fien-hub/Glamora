import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';

class SoundService {
  private clickSound: Sound | null = null;
  private isEnabled: boolean = true;
  private isLoaded: boolean = false;

  async initialize() {
    try {
      // Set audio mode for sound effects
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load click sound - simple UI click sound
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/click.mp3'),
        { shouldPlay: false, volume: 0.3 }
      );
      
      this.clickSound = sound;
      this.isLoaded = true;
      console.log('[SoundService] Click sound loaded successfully');
    } catch (error) {
      console.error('[SoundService] Failed to load click sound:', error);
      this.isLoaded = false;
    }
  }

  async playClick() {
    if (!this.isEnabled || !this.isLoaded || !this.clickSound) {
      return;
    }

    try {
      // Reset to beginning and play
      await this.clickSound.setPositionAsync(0);
      await this.clickSound.playAsync();
    } catch (error) {
      console.error('[SoundService] Failed to play click sound:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log('[SoundService] Sound effects', enabled ? 'enabled' : 'disabled');
  }

  isEnabledStatus(): boolean {
    return this.isEnabled;
  }

  async cleanup() {
    try {
      if (this.clickSound) {
        await this.clickSound.unloadAsync();
        this.clickSound = null;
        this.isLoaded = false;
      }
    } catch (error) {
      console.error('[SoundService] Failed to cleanup sound:', error);
    }
  }
}

export const soundService = new SoundService();
