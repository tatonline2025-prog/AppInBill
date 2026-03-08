import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";

/**
 * Lưu trữ trạng thái Bluetooth đã bật hay chưa
 * Sử dụng cached value thay vì thư viện bên ngoài
 */
let cachedBluetoothState: boolean | null = null;

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    // Bước 1: Kiểm tra Bluetooth đã bật chưa (sử dụng phương pháp thủ công)
    const btEnabled = await isBluetoothEnabled();
    if (!btEnabled) {
      Alert.alert(
        "Bluetooth chưa bật",
        "Vui lòng bật Bluetooth để có thể kết nối máy in.",
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Mở Bluetooth", 
            onPress: () => {
              try {
                // Thử mở cài đặt Bluetooth
                Linking.openSettings();
              } catch (e) {
                console.warn("Không thể mở cài đặt:", e);
              }
            } 
          },
        ]
      );
      return false;
    }

    // Bước 2: Yêu cầu quyền Bluetooth dựa trên phiên bản Android
    if (Platform.Version >= 31) {
      // Android 12+ (API 31+): Nearby Devices permissions
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const bluetoothScanGranted = granted["android.permission.BLUETOOTH_SCAN"] === "granted";
      const bluetoothConnectGranted = granted["android.permission.BLUETOOTH_CONNECT"] === "granted";

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
        return false;
      }

      return true;
    } else if (Platform.Version >= 29) {
      // Android 10-11: Cần location permission cho Bluetooth discovery
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Quyền vị trí",
          message: "Ứng dụng cần quyền vị trí để tìm kiếm máy in Bluetooth.",
          buttonNeutral: "Hỏi sau",
          buttonNegative: "Hủy",
          buttonPositive: "Đồng ý",
        }
      );
      
      if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
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
        return false;
      }
      
      return true;
    } else {
      // Android 9 trở xuống: Không cần thêm quyền đặc biệt
      return true;
    }
  } catch (err) {
    console.warn("Lỗi khi xin quyền Bluetooth:", err);
    
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
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (fallbackError) {
      console.warn("Lỗi khi yêu cầu quyền fallback:", fallbackError);
      return false;
    }
  }
}

// Hàm kiểm tra nhanh Bluetooth đã bật chưa (không hiển thị alert)
// Sử dụng phương pháp thủ công thay vì thư viện bên ngoài
export async function isBluetoothEnabled(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  
  // Nếu đã có cache, trả về ngay
  if (cachedBluetoothState !== null) {
    return cachedBluetoothState;
  }
  
  try {
    // Thử kiểm tra quyền Bluetooth (Android 12+)
    if (Platform.Version >= 31) {
      const scanGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const connectGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      
      // Nếu có quyền, coi như Bluetooth có thể bật được
      // (Không thể kiểm tra chính xác trạng thái bật/tắt mà không dùng thư viện)
      cachedBluetoothState = scanGranted && connectGranted;
      return cachedBluetoothState;
    } else {
      // Android 11 và thấp hơn: kiểm tra quyền location
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      cachedBluetoothState = granted;
      return cachedBluetoothState;
    }
  } catch (err) {
    console.warn("Lỗi kiểm tra trạng thái Bluetooth:", err);
    // Mặc định coi như đã bật để cho phép người dùng thử
    cachedBluetoothState = true;
    return cachedBluetoothState;
  }
}

/**
 * Reset cache trạng thái Bluetooth - gọi khi người dùng thay đổi cài đặt
 */
export function resetBluetoothStateCache(): void {
  cachedBluetoothState = null;
}

