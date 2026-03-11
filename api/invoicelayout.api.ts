import { InvoiceLayoutItem } from "@/types/invoice-layout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const BASE_URL = Constants.expoConfig?.extra?.appBill;
const REQUEST_TIMEOUT_MS = 6000;

if (!BASE_URL) {
  throw new Error("BASE_URL chưa được cấu hình trong extra");
}

export const saveInvoiceLayout = async (layoutID: string, layout: InvoiceLayoutItem[]) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("Không tìm thấy token người dùng");

    const res = await axios.put(
      `${BASE_URL}/api/invoiceslayout/save`,
      { layoutID, layout },
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res;
  } catch (err: any) {
    console.error("❌ Lỗi khi lưu layout:", err?.response?.data || err.message);
    throw new Error(err?.response?.data?.message || "Không thể lưu cấu hình hoá đơn");
  }
};

export const getInvoiceLayout = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    
    const res = await axios.get(`${BASE_URL}/api/invoiceslayout/get`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    });

    if (!res.data || !Array.isArray(res.data)) {
      throw new Error("Response dữ liệu không hợp lệ");
    }

    return res.data;
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message 
      || error?.message 
      || "Không thể tải cấu hình hoá đơn";
    console.error("❌ Lỗi khi tải layout:", errorMsg);
    return null;
  }
};
