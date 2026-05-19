import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, isAxiosError } from "axios";
import Constants from "expo-constants";

const BASE_URL = Constants.expoConfig?.extra?.appBill;

export const changePassword = async (oldPassword: string, newPassword: string) => {
  if (!BASE_URL) throw new Error("BASE_URL chưa được cấu hình");
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Không tìm thấy token người dùng");

  try {
    const res = await axios.put(
      `${BASE_URL}/api/user/change-password`,
      { oldPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res;
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;
      if (status === 401) throw new Error("Mật khẩu cũ không đúng");
      if (status === 400) throw new Error(serverMessage || "Dữ liệu không hợp lệ");
      throw new Error(serverMessage || "Không thể đổi mật khẩu");
    }
    throw new Error("Không thể kết nối mạng khi đổi mật khẩu");
  }
};

export const updateCollectionFee = async (userId: string, fee: number) => {
  if (!BASE_URL) {
    throw new Error("BASE_URL chua duoc cau hinh trong extra");
  }
  if (!userId) {
    throw new Error("Thieu userId khi cap nhat phi dich vu");
  }
  if (!Number.isFinite(fee) || fee < 0) {
    throw new Error("Phi dich vu khong hop le");
  }

  const token = await AsyncStorage.getItem("token");

  try {
    const res = await axios.put(
      `${BASE_URL}/api/user/${userId}/update-fee`,
      {
        collectionFee: fee,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  } catch (error) {
    if (isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status;
      const serverMessage = axiosError.response?.data?.message;

      if (status === 401) {
        throw new Error("Phien dang nhap het han, vui long dang nhap lai");
      }
      if (status === 403) {
        throw new Error(serverMessage || "Tai khoan nay khong co quyen cap nhat phi dich vu");
      }
      if (status === 400) {
        throw new Error(serverMessage || "Du lieu phi dich vu khong hop le");
      }
      throw new Error(serverMessage || `Cap nhat phi that bai (${status || "NETWORK"})`);
    }

    throw new Error("Khong the ket noi mang khi cap nhat phi dich vu");
  }
};
