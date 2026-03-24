import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getHRSettings,
  setAge,
  setMaxHrOverride,
  setPairedDeviceId,
  clearPairedDevice,
  getComputedMaxHR,
} from '../HRSettingsService';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

describe('HRSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: AsyncStorage returns null for all keys
    mockGetItem.mockResolvedValue(null);
  });

  describe('getHRSettings', () => {
    it('returns all nulls when AsyncStorage is empty', async () => {
      const settings = await getHRSettings();
      expect(settings).toEqual({
        age: null,
        maxHrOverride: null,
        pairedDeviceId: null,
      });
    });

    it('returns age and pairedDeviceId after they are set', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === 'hr_settings_age') {
          return Promise.resolve('35');
        }
        if (key === 'hr_settings_paired_device_id') {
          return Promise.resolve('abc-123');
        }
        return Promise.resolve(null);
      });

      const settings = await getHRSettings();
      expect(settings).toEqual({
        age: 35,
        maxHrOverride: null,
        pairedDeviceId: 'abc-123',
      });
    });
  });

  describe('setAge', () => {
    it('stores age as string under hr_settings_age key', async () => {
      await setAge(35);
      expect(mockSetItem).toHaveBeenCalledWith('hr_settings_age', '35');
    });
  });

  describe('setMaxHrOverride', () => {
    it('stores max HR override as string under hr_settings_max_hr_override key', async () => {
      await setMaxHrOverride(185);
      expect(mockSetItem).toHaveBeenCalledWith('hr_settings_max_hr_override', '185');
    });

    it('removes hr_settings_max_hr_override when called with null', async () => {
      await setMaxHrOverride(null);
      expect(mockRemoveItem).toHaveBeenCalledWith('hr_settings_max_hr_override');
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });

  describe('setPairedDeviceId', () => {
    it('stores device ID under hr_settings_paired_device_id key', async () => {
      await setPairedDeviceId('device-abc');
      expect(mockSetItem).toHaveBeenCalledWith('hr_settings_paired_device_id', 'device-abc');
    });
  });

  describe('clearPairedDevice', () => {
    it('removes hr_settings_paired_device_id from AsyncStorage', async () => {
      await clearPairedDevice();
      expect(mockRemoveItem).toHaveBeenCalledWith('hr_settings_paired_device_id');
    });
  });

  describe('getComputedMaxHR', () => {
    it('returns Tanaka-computed value (183.5) when age is 35 and no override', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === 'hr_settings_age') {
          return Promise.resolve('35');
        }
        return Promise.resolve(null);
      });

      const maxHR = await getComputedMaxHR();
      expect(maxHR).toBe(183.5); // 208 - 0.7 * 35 = 183.5
    });

    it('returns override value (190) when age is 35 and maxHrOverride is 190', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === 'hr_settings_age') {
          return Promise.resolve('35');
        }
        if (key === 'hr_settings_max_hr_override') {
          return Promise.resolve('190');
        }
        return Promise.resolve(null);
      });

      const maxHR = await getComputedMaxHR();
      expect(maxHR).toBe(190);
    });

    it('returns null when age is not set', async () => {
      mockGetItem.mockResolvedValue(null);

      const maxHR = await getComputedMaxHR();
      expect(maxHR).toBeNull();
    });
  });
});
