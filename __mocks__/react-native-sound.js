const Sound = jest.fn().mockImplementation((filename, basePath, callback) => {
  if (callback) { callback(null); }
  return {
    play: jest.fn((cb) => cb && cb(true)),
    stop: jest.fn(),
    release: jest.fn(),
    setVolume: jest.fn(),
    setNumberOfLoops: jest.fn(),
    setCategory: jest.fn(),
  };
});
Sound.setCategory = jest.fn();
Sound.MAIN_BUNDLE = '';

module.exports = Sound;
