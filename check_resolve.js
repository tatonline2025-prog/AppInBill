const rnPath = require.resolve('react-native/package.json');
const rnDir = require('path').dirname(rnPath);

const expoPath = require.resolve('expo/package.json');
const expoDir = require('path').dirname(expoPath);

const expoModulesPath = require.resolve('expo-modules-autolinking/package.json', { paths: [expoPath] });

console.log("RN path:", rnPath);
console.log("Expo path:", expoPath);
console.log("Expo modules autolinking path:", expoModulesPath);

const expoPluginsPath = require('path').join(expoModulesPath, '../android/expo-gradle-plugin');
console.log("Expo plugins path:", expoPluginsPath);
