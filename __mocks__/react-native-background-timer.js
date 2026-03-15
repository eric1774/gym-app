const BackgroundTimer = {
  setInterval: jest.fn((callback, delay) => {
    return global.setInterval(callback, delay);
  }),
  clearInterval: jest.fn((id) => {
    global.clearInterval(id);
  }),
  setTimeout: jest.fn((callback, delay) => {
    return global.setTimeout(callback, delay);
  }),
  clearTimeout: jest.fn((id) => {
    global.clearTimeout(id);
  }),
  start: jest.fn(),
  stop: jest.fn(),
};

module.exports = {
  __esModule: true,
  default: BackgroundTimer,
};
