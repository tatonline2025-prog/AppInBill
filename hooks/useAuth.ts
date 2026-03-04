import { IUser } from "@/types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react"; // Thêm useCallback để tối ưu

const BASE_URL = Constants.expoConfig?.extra?.appBill;

// Xử lý graceful - không throw Error mà chỉ log cảnh báo
if (!BASE_URL) {
  console.warn("⚠️ BASE_URL chưa được cấu hình. Vui lòng cấu hình EXPO_PUBLIC_APP_BILL trong Expo secrets.");
}

export function useAuth() {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null); // Thêm state Token để quản lý
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // 1. Tách logic lấy user ra thành hàm riêng để có thể gọi lại bất cứ lúc nào
  const refreshUser = useCallback(async () => {
    try {
      // Kiểm tra BASE_URL trước khi gọi API
      if (!BASE_URL) {
        setError("BASE_URL chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
        setLoading(false);
        return;
      }

      // Lấy token từ storage
      const storedToken = await AsyncStorage.getItem("token");

      if (!storedToken) {
        setLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        return;
      }

      setToken(storedToken); // Cập nhật token vào state

      // Gọi API lấy thông tin mới nhất
      const res = await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        timeout: 15000,
      });

      // Cập nhật User mới vào State
      setUser(res.data.user);
      setIsAuthenticated(true);
      setError(null);
    } catch (err: any) {
      console.log("Lỗi xác thực hoặc hết hạn token:", err);
      
      // Xử lý các loại lỗi
      if (err.code === 'ECONNABORTED') {
        setError("Không thể kết nối server. Vui lòng kiểm tra kết nối mạng");
      } else if (err.response?.status === 401) {
        setError(null); // Token hết hạn - redirect về login
        await logout();
        return;
      } else if (err.response?.status >= 500) {
        setError("Lỗi server. Vui lòng thử lại sau");
      } else {
        setError("Đã xảy ra lỗi. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. useEffect chỉ đơn giản là gọi hàm refreshUser khi component mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setError(null);
    router.replace("/login");
  };

  // 3. Trả về refreshUser và token để bên ngoài sử dụng
  return {
    user,
    token, // Trả thêm token nếu cần dùng gọi API khác
    loading,
    isAuthenticated,
    logout,
    refreshUser, // <--- QUAN TRỌNG: Xuất hàm này ra
    error, // Trả thêm error để hiển thị cho user
  };
}
