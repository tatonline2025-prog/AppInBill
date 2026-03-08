import { captureRef } from "react-native-view-shot";

// Hàm chuyển bill component (ref) thành ảnh Base64 thô
export const generateBillImage = async (ref: any, timeoutMs: number = 5000): Promise<string | null> => {
  // Kiểm tra ref có tồn tại không
  if (!ref || !ref.current) {
    console.error("Ref không tồn tại");
    return null;
  }

  try {
    // Sử dụng Promise.race để timeout nếu captureRef quá lâu
    const capturePromise = captureRef(ref, {
      format: "png",
      quality: 1.0,
      result: "base64",
    });

    const timeoutPromise = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error("Tạo ảnh quá thời gian")), timeoutMs)
    );

    const base64 = await Promise.race([capturePromise, timeoutPromise]);
    return base64 as string;
  } catch (err) {
    console.error("Lỗi khi tạo ảnh từ hóa đơn:", err);
    return null;
  }
};

