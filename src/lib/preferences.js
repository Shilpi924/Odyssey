import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const PREFS_KEY = 'userPreferences';

function isNative() {
  return Capacitor.isNativePlatform();
}

/**
 * Save user preferences to local storage and native Preferences backup if available
 */
export async function saveLocalPreferences(prefs) {
  const valueStr = JSON.stringify(prefs);
  
  // Always save to localStorage for fast synchronous access
  if (typeof window !== 'undefined') {
    localStorage.setItem(PREFS_KEY, valueStr);
  }
  
  // Backup to native preferences if on mobile device
  if (isNative()) {
    try {
      await Preferences.set({
        key: PREFS_KEY,
        value: valueStr,
      });
    } catch (err) {
      console.error('Failed to save native preferences backup:', err);
    }
  }
}

/**
 * Restores preferences from native Preferences backup to localStorage if local storage is empty
 */
export async function restorePreferencesFromBackup() {
  if (typeof window === 'undefined') return null;
  
  const localVal = localStorage.getItem(PREFS_KEY);
  if (localVal) {
    try {
      return JSON.parse(localVal);
    } catch {
      // If malformed, proceed to backup
    }
  }
  
  if (isNative()) {
    try {
      const { value } = await Preferences.get({ key: PREFS_KEY });
      if (value) {
        localStorage.setItem(PREFS_KEY, value);
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
    } catch (err) {
      console.error('Failed to read native preferences backup:', err);
    }
  }
  
  return null;
}

/**
 * Remove local preferences and native Preferences backup
 */
export async function removeLocalPreferences() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PREFS_KEY);
  }
  
  if (isNative()) {
    try {
      await Preferences.remove({ key: PREFS_KEY });
    } catch (err) {
      console.error('Failed to clear native preferences:', err);
    }
  }
}
