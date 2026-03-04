// context/AuthContext.tsx
import { IUser } from "@/types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { useSegments } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

const BASE_URL = Constants.expoConfig?.extra?.appBill;

// 1. Tạo instance API bên ngoài Component (Singleton Pattern)
// Export ra để các màn hình khác (như collected, uncollected) có thể import và dùng
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

  const segments = useSegments(); // Có thể giữ hoặc bỏ nếu không dùng

  // --- HÀM LOGOUT ---
  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (e) {
      console.error("Logout error", e);
    }
    // Cập nhật State để UI phản hồi ngay lập tức
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  // --- SETUP AXIOS INTERCEPTOR ---
  // Dùng useEffect để gắn interceptor một lần khi logout thay đổi
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Gọi hàm logout để vừa xóa storage, vừa update state, vừa redirect
          await logout();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor khi component unmount (tránh memory leak)
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  const checkTokenExpiry = useCallback(async (storedToken: string) => {
    try {
      const decoded: any = jwtDecode(storedToken);
      const now = Date.now() / 1000;
      return decoded.exp > now; // Trả về true nếu còn hạn
    } catch (e) {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const isValid = await checkTokenExpiry(storedToken);
      if (!isValid) {
        throw new Error("Token expired locally");
      }

      setToken(storedToken);

      // QUAN TRỌNG: Dùng 'api' đã tạo ở trên, KHÔNG dùng 'axios' thường
      const res = await api.get(`/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      setUser(res.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Auth failed:", error);
      await logout();
    } finally {
      setLoading(false);
    }
  }, [logout, checkTokenExpiry]);

  // --- APP STATE LISTENER ---
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        refreshUser();
      }
    });
    return () => subscription.remove();
  }, [refreshUser]);

  // Check lần đầu
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
