import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { PixelRatio } from "react-native";

// Định nghĩa kiểu dữ liệu
interface FontContextType {
  scale: number;
  changeScale: (newScale: number) => void;
  calcSize: (size: number) => number;
}

const FontContext = createContext<FontContextType>({
  scale: 1,
  changeScale: (_val) => {},
  calcSize: (size) => size,
});

export const FontProvider = ({ children }: { children: React.ReactNode }) => {
  const [scale, setScale] = useState(1);

  // Khi mở app: Đọc dữ liệu cũ từ bộ nhớ
  useEffect(() => {
    const loadScale = async () => {
      try {
        const savedScale = await AsyncStorage.getItem("user_font_scale");
        if (savedScale) {
          setScale(parseFloat(savedScale));
        }
      } catch (e) {
        console.error("Lỗi đọc font size", e);
      }
    };
    loadScale();
  }, []);

  // Hàm đổi cỡ chữ và lưu lại
  const changeScale = async (newScale: number) => {
    setScale(newScale);
    try {
      await AsyncStorage.setItem("user_font_scale", newScale.toString());
    } catch (e) {
      console.error("Lỗi lưu font size", e);
    }
  };

  // Hàm tính toán size: (Size gốc / Tỷ lệ máy) * Tỷ lệ người dùng chọn
  // Chia cho getFontScale() để bỏ qua setting của điện thoại, chỉ nghe theo setting trong app
  const calcSize = (size: number) => {
    return (size / PixelRatio.getFontScale()) * scale;
  };

  return <FontContext.Provider value={{ scale, changeScale, calcSize }}>{children}</FontContext.Provider>;
};

// Hook để các màn hình khác gọi dùng
export const useFont = () => useContext(FontContext);
