module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  moduleDirectories: ['node_modules', 'src'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: [
    // '**/tests/**/*.test.ts',
    // '**/tests/config/*.test.ts',
    '**/tests/controllers/*.test.ts',
    '**/tests/helpers/*.test.ts',
    // '**/tests/interfaces/*.test.ts',
    '**/tests/middleware/*.test.ts',
    '**/tests/services/*.test.ts',
    '<rootDir>/src/**/*.spec.ts'
  ],
  setupFiles: ['<rootDir>/jest.setup.js']
};
