// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
}));

// Mock react-native-sound-level
jest.mock('react-native-sound-level', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  onNewFrame: null,
}));

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      ASSEMBLYAI_API_KEY: 'test-key',
      GROK_API_KEY: 'test-key',
    },
  },
}));

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
