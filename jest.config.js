module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  verbose: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
