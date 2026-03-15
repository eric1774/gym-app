const notifee = {
  createChannel: jest.fn().mockResolvedValue('channel-id'),
  displayNotification: jest.fn().mockResolvedValue('notif-id'),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  getNotificationSettings: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  onForegroundEvent: jest.fn().mockReturnValue(() => {}),
  onBackgroundEvent: jest.fn(),
};

const AndroidImportance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MIN: 1,
  NONE: 0,
};

module.exports = {
  __esModule: true,
  default: notifee,
  AndroidImportance,
};
