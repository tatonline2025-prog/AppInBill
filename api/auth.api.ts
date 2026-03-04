import { IUserResponse } from "@/types/user";
import axios, { AxiosError } from "axios";
import Constants from "expo-constants";

const BASE_URL = Constants.expoConfig?.extra?.appBill;

export const login = async (userName: string, password: string) => {
  if (!BASE_URL) {
    throw new Error("BASE_URL chưa được cấu hình trong extra. Vui lòng cấu hình EXPO_PUBLIC_APP_BILL trong Expo secrets.");
  }

  try {
    const res = await axios.post<IUserResponse>(`${BASE_URL}/api/auth/login`, {
      userName,
      password,
    }, {
      timeout: 15000,
    });

    return res;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        if (status === 401) {
          throw new Error("Tên đăng nhập hoặc mật khẩu không đúng");
        } else if (status === 500) {
          throw new Error("Lỗi server. Vui lòng thử lại sau");
        } else {
          throw new Error(`Lỗi từ server: ${status}`);
        }
      } else if (axiosError.request) {
        throw new Error("Không thể kết nối server. Vui lòng kiểm tra kết nối mạng");
      }
    }
    
    console.error("Login error:", error);
    throw new Error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
  }
};
