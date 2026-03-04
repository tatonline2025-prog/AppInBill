import { captureRef } from "react-native-view-shot";

// Hàm chuyển bill component (ref) thành ảnh Base64 thô
export const generateBillImage = async (ref: any) => {
  try {
    const base64 = await captureRef(ref, {
      format: "png",
      quality: 1.0, // Giảm xuống 0.9 hoặc 1.0 đều ổn
      result: "base64",
    });
    return base64; // <--- Chỉ trả về chuỗi base64 thô
  } catch (err) {
    console.error("Lỗi khi tạo ảnh từ hoá đơn:", err);
    return null;
  }
};
