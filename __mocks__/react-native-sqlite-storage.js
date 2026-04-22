const emptyResultSet = {
  rows: {
    length: 0,
    item: () => ({}),
    raw: () => [],
  },
  rowsAffected: 0,
  insertId: 0,
};

function createMockDatabase() {
  return {
    executeSql: jest.fn(() => Promise.resolve([emptyResultSet])),
    transaction: jest.fn((work) => {
      if (typeof work === 'function') {
        work({
          executeSql: jest.fn((_sql, _params, success) => {
            if (typeof success === 'function') {
              success(null, emptyResultSet);
            }
          }),
        });
      }
      return Promise.resolve();
    }),
    close: jest.fn(() => Promise.resolve()),
  };
}

module.exports = {
  __esModule: true,
  default: {
    enablePromise: jest.fn(),
    openDatabase: jest.fn(() => Promise.resolve(createMockDatabase())),
    DEBUG: jest.fn(),
  },
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => Promise.resolve(createMockDatabase())),
  DEBUG: jest.fn(),
};
