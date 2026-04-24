import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserFirstName, setUserFirstName } from '../UserProfileService';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const KEY = '@userProfile.firstName';

describe('UserProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  describe('getUserFirstName', () => {
    it('returns null when no name has been saved', async () => {
      const result = await getUserFirstName();
      expect(result).toBeNull();
      expect(mockGetItem).toHaveBeenCalledWith(KEY);
    });

    it('persists a saved name across reads', async () => {
      mockGetItem.mockResolvedValue('Eric');
      const result = await getUserFirstName();
      expect(result).toBe('Eric');
    });
  });

  describe('setUserFirstName', () => {
    it('trims whitespace when saving', async () => {
      await setUserFirstName('  Eric  ');
      expect(mockSetItem).toHaveBeenCalledWith(KEY, 'Eric');
      expect(mockRemoveItem).not.toHaveBeenCalled();
    });

    it('treats empty string as null (clears saved value)', async () => {
      await setUserFirstName('');
      expect(mockRemoveItem).toHaveBeenCalledWith(KEY);
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('allows explicit null to clear the saved name', async () => {
      await setUserFirstName(null);
      expect(mockRemoveItem).toHaveBeenCalledWith(KEY);
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });
});
