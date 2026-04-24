import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@userProfile.firstName';

/**
 * Retrieve the user's first name from AsyncStorage.
 * Returns null if no name has been saved.
 */
export async function getUserFirstName(): Promise<string | null> {
  const v = await AsyncStorage.getItem(KEY);
  if (v === null || v === '') { return null; }
  return v;
}

/**
 * Save the user's first name to AsyncStorage.
 * Null, empty string, or whitespace-only input clears any saved value.
 * Leading/trailing whitespace is trimmed before saving.
 */
export async function setUserFirstName(firstName: string | null): Promise<void> {
  const trimmed = firstName?.trim() ?? '';
  if (trimmed === '') {
    await AsyncStorage.removeItem(KEY);
  } else {
    await AsyncStorage.setItem(KEY, trimmed);
  }
}
