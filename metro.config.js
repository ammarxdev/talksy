// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for 3D model and texture files
config.resolver.assetExts.push(
  'glb',
  'gltf',
  'obj',
  'mtl',
  'dae',
  'bin',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tga',
  'hdr',
  'exr'
);

// Resolve path aliases and Three.js version conflicts
const path = require('path');
config.resolver.alias = {
  // Support @/* imports (e.g., '@/components/HapticTab')
  '@': path.resolve(__dirname),
  // Ensure a single instance of three is used
  'three': path.resolve(__dirname, 'node_modules/three'),
};

// Ensure proper module resolution for React Three Fiber
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Add a custom resolver for aliases like "@/" which can otherwise be treated
// like an npm scope by Node-style resolution on Linux (EAS build machines)
const ALIASES = {
  '@/': path.resolve(__dirname),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const absolutePath = path.resolve(ALIASES['@/'], moduleName.replace(/^@\//, ''));
    return context.resolveRequest(context, absolutePath, platform);
  }
  // Fall back to default
  return context.resolveRequest(context, moduleName, platform);
};

// Additional resolver configuration to prevent duplicate modules
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json'];

// Dedupe modules to prevent multiple instances
config.resolver.blockList = [
  // Block duplicate three.js instances from node_modules subdirectories
  /node_modules\/.*\/node_modules\/three\/.*/,
];

module.exports = config;
