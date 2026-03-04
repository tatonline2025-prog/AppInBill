import { Alert, PermissionsAndroid, Platform } from "react-native";

export async function requestBluetoothPermissions() {
  if (Platform.OS !== "android") return true;

  try {
    if (Platform.Version >= 31) {
      // Android 12+ (API 31+): Nearby Devices permissions
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const allGranted =
        granted["android.permission.BLUETOOTH_SCAN"] === "granted" &&
        granted["android.permission.BLUETOOTH_CONNECT"] === "granted";

      if (!allGranted) {
        Alert.alert(
          "Thieu quyen Bluetooth",
          "Ung dung can quyen Bluetooth de quet may in. Hay vao Cai dat > Quyen > cap lai quyen."
        );
      }

      return allGranted;
    }

    // Android 11 and below: location permission is required for Bluetooth discovery.
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn("Loi khi xin quyen Bluetooth:", err);
    return false;
  }
}
