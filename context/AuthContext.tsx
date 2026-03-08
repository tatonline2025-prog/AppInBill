// context/AuthContext.tsx
import { IUser } from "@/types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { jwtDecode } from "jwt-decode";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const BASE_URL = Constants.expoConfig?.extra?.appBill;

// Xử lý graceful - không throw Error mà chỉ log cảnh báo
if (!BASE_URL) {
  console.warn("⚠️ BASE_URL chưa được cấu hình. Vui lòng cấu hình EXPO_PUBLIC_APP_BILL trong Expo secrets.");
}

// 1. Tạo instance API bên ngoài Component (Singleton Pattern)
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sử dụng ref để theo dõi trạng thái refresh
  const isRefreshing = useRef(false);

  // --- HÀM LOGOUT ---
  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (e) {
      console.error("Logout error", e);
    }
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // --- CHECK TOKEN EXPIRY ---
  const checkTokenExpiry = useCallback(async (storedToken: string) => {
    try {
      const decoded: any = jwtDecode(storedToken);
      const now = Date.now() / 1000;
      return decoded.exp > now;
    } catch (e) {
      return false;
    }
  }, []);

  // --- REFRESH USER ---
  const refreshUser = useCallback(async () => {
    // Nếu đang trong quá trình refresh rồi thì không gọi lại
    if (isRefreshing.current) {
      return;
    }

    try {
      // Kiểm tra BASE_URL trước khi gọi API
      if (!BASE_URL) {
        console.log("BASE_URL not configured - skipping auth check");
        setLoading(false);
        setIsAuthenticated(false);
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

      // Kiểm tra token hết hạn cục bộ
      const isValid = await checkTokenExpiry(storedToken);
      if (!isValid) {
        console.log("Token expired locally");
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      setToken(storedToken);

      // Gọi API để lấy thông tin user với timeout
      try {
        const res = await api.get(`/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
          timeout: 5000, // 5 second timeout
        });

        const userData = res.data?.user;
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          setError(null);
        } else {
          console.log("Invalid user data from server");
          setIsAuthenticated(false);
        }
      } catch (apiError: any) {
        console.log("API call failed:", apiError?.message || "Unknown error");
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      console.error("Auth failed:", err?.message || err);
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
      isRefreshing.current = false;
    }
  }, [checkTokenExpiry]);

  // Check lần đầu khi component mount
  useEffect(() => {
    // Đặt loading = false sau 5 giây bất kể kết quả (fallback)
    const timer = setTimeout(() => {
      console.log("Auth check timeout - forcing loading=false");
      setLoading(false);
    }, 5000);

    refreshUser();

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, error, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

