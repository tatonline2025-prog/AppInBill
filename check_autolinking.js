const { execSync } = require('child_process');
const result = execSync('node node_modules/expo/bin/cli expo-modules-autolinking react-native-config --platform android --json', {
  cwd: 'e:/A_TAT_PhamThiMinhTran/InBillApp/InBillApp',
  encoding: 'utf8'
});
console.log(result);
