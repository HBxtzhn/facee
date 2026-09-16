// Metro config for Expo SDK 57 + RN 0.86
// 兼容老 markdown-it 等依赖 Node 内置模块 (punycode) 的库
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const projectRoot = __dirname;
const nodeRoot = path.join(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// 让 metro 能解析 require('punycode') / require('node:punycode')
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  punycode: path.join(nodeRoot, 'punycode'),
};

// 关键：旧库以 require() 方式引用 polyfill，确保不被打入浏览器专用 polyfill 栈
config.resolver.unstable_enablePackageExports = false;

module.exports = config;