/**
 * Cấu hình chung cho ứng dụng
 * Tập trung tất cả các biến môi trường và cấu hình tại đây
 */
import Constants from "expo-constants";

// ✅ BASE_URL dùng chung cho tất cả API calls
export const BASE_URL = Constants.expoConfig?.extra?.appBill;

if (!BASE_URL) {
  console.warn("⚠️ BASE_URL chưa được cấu hình. Vui lòng cấu hình EXPO_PUBLIC_APP_BILL trong Expo secrets.");
}

// Timeout mặc định cho API calls (ms)
export const API_TIMEOUT = 15000;

