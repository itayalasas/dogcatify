const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Simplify the configuration to avoid path resolution issues
config.resolver.alias = {
  '@': __dirname,
};

// Ensure proper source extensions
config.resolver.sourceExts = [
  'expo.ts',
  'expo.tsx',
  'expo.js',
  'expo.jsx',
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'wasm',
  'svg',
];

// Ensure proper asset extensions
config.resolver.assetExts = [
  'glb',
  'gltf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'mp4',
  'webm',
  'wav',
  'mp3',
  'm4a',
  'aac',
  'oga',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  'ico',
  'pdf',
  'bin',
];

// Simplify platforms
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Remove problematic configurations that might cause undefined paths
delete config.watchFolders;
delete config.transformer.minifierConfig;

module.exports = config;