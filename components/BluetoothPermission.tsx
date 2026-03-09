import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";

/**
 * Yêu cầu quyền Bluetooth và kiểm tra trạng thái Bluetooth
 * @returns true nếu có đủ quyền, false nếu không
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  console.log(">>> requestBluetoothPermissions START");
  
  if (Platform.OS !== "android") {
    console.log(">>> requestBluetoothPermissions: Not Android, return true");
    return true;
  }

  try {
    // Bước 1: Yêu cầu quyền Bluetooth dựa trên phiên bản Android
    if (Platform.Version >= 31) {
      // Android 12+ (API 31+): Nearby Devices permissions
      console.log(">>> requestBluetoothPermissions: Android 12+");
      
      // Trước tiên kiểm tra xem đã được cấp quyền chưa
      const scanGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const connectGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      
      console.log(">>> requestBluetoothPermissions: scanGranted =", scanGranted, "connectGranted =", connectGranted);
      
      // Nếu đã có đủ quyền, trả về true ngay
      if (scanGranted && connectGranted) {
        console.log(">>> requestBluetoothPermissions: Already granted, return true");
        return true;
      }
      
      // Nếu chưa có quyền, hiển thị dialog yêu cầu
      console.log(">>> requestBluetoothPermissions: Requesting permissions...");
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const bluetoothScanGranted = granted["android.permission.BLUETOOTH_SCAN"] === "granted";
      const bluetoothConnectGranted = granted["android.permission.BLUETOOTH_CONNECT"] === "granted";

      console.log(">>> requestBluetoothPermissions: Result - scan =", bluetoothScanGranted, "connect =", bluetoothConnectGranted);

      if (!bluetoothScanGranted || !bluetoothConnectGranted) {
        Alert.alert(
          "Thiếu quyền Bluetooth",
          "Ứng dụng cần quyền Bluetooth để quét máy in. Vui lòng cấp quyền trong Cài đặt > Quyền.",
          [
            { text: "Hủy", style: "cancel" },
            { 
              text: "Mở Cài đặt", 
              onPress: () => Linking.openSettings() 
            },
          ]
        );
        console.log(">>> requestBluetoothPermissions: Permission denied, return false");
        return false;
      }

      console.log(">>> requestBluetoothPermissions: Permission granted, return true");
      return true;
    } else if (Platform.Version >= 29) {
      // Android 10-11: Cần location permission cho Bluetooth discovery
      console.log(">>> requestBluetoothPermissions: Android 10-11");
      
      // Kiểm tra đã có quyền chưa
      const locationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      if (locationGranted) {
        console.log(">>> requestBluetoothPermissions: Location already granted, return true");
        return true;
      }
      
      // Yêu cầu quyền nếu chưa có
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Quyền vị trí",
          message: "Ứng dụng cần quyền vị trí để tìm kiếm máy in Bluetooth.",
          buttonNeutral: "Hỏi sau",
          buttonNegative: "Hủy",
          buttonPositive: "Đồng ý",
        }
      );
      
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          "Thiếu quyền vị trí",
          "Quyền vị trí cần thiết để tìm kiếm máy in Bluetooth. Vui lòng cấp quyền trong Cài đặt.",
          [
            { text: "Hủy", style: "cancel" },
            { 
              text: "Mở Cài đặt", 
              onPress: () => Linking.openSettings() 
            },
          ]
        );
        console.log(">>> requestBluetoothPermissions: Location permission denied, return false");
        return false;
      }
      
      console.log(">>> requestBluetoothPermissions: Location permission granted, return true");
      return true;
    } else {
      // Android 9 trở xuống: Không cần thêm quyền đặc biệt
      console.log(">>> requestBluetoothPermissions: Android 9 or lower, return true");
      return true;
    }
  } catch (err) {
    console.warn(">>> requestBluetoothPermissions: Error:", err);
    
    // Thử yêu cầu quyền cơ bản nếu có lỗi
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Quyền vị trí",
          message: "Ứng dụng cần quyền vị trí để tìm kiếm máy in Bluetooth.",
          buttonNeutral: "Hỏi sau",
          buttonNegative: "Hủy",
          buttonPositive: "Đồng ý",
        }
      );
      const result = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log(">>> requestBluetoothPermissions: Fallback result:", result);
      return result;
    } catch (fallbackError) {
      console.warn(">>> requestBluetoothPermissions: Fallback error:", fallbackError);
      return false;
    }
  }
}

/**
 * Kiểm tra xem ứng dụng đã có quyền Bluetooth cần thiết hay chưa
 * @returns true nếu đã có đủ quyền, false nếu chưa
 */
export async function isBluetoothEnabled(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  
  try {
    // Kiểm tra quyền Bluetooth (Android 12+)
    if (Platform.Version >= 31) {
      const scanGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const connectGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      
      // Nếu có đủ quyền, coi như có thể sử dụng Bluetooth
      return scanGranted && connectGranted;
    } else if (Platform.Version >= 29) {
      // Android 10-11: kiểm tra quyền location
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted;
    } else {
      // Android 9 trở xuống: luôn trả về true (không cần kiểm tra thêm)
      return true;
    }
  } catch (err) {
    console.warn("Lỗi kiểm tra trạng thái Bluetooth:", err);
    // Khi có lỗi, trả về false để buộc phải kiểm tra lại quyền
    return false;
  }
}

