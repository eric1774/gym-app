const mockExecuteSql = jest.fn().mockResolvedValue([{
  insertId: 0,
  rowsAffected: 0,
  rows: { length: 0, item: jest.fn(), raw: jest.fn().mockReturnValue([]) },
}]);

const mockTransaction = jest.fn((callback) => {
  const tx = { executeSql: jest.fn() };
  callback(tx);
  return Promise.resolve();
});

const mockDatabase = {
  executeSql: mockExecuteSql,
  transaction: mockTransaction,
  close: jest.fn().mockResolvedValue(undefined),
};

const SQLite = {
  openDatabase: jest.fn().mockResolvedValue(mockDatabase),
  enablePromise: jest.fn(),
};

module.exports = {
  __esModule: true,
  default: SQLite,
  openDatabase: SQLite.openDatabase,
  enablePromise: SQLite.enablePromise,
};
