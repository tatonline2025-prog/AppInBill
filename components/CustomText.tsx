import { useFont } from "@/context/FontContext";
import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

interface CustomTextProps extends TextProps {
  size?: number;
  /** * fixedSize = true: Dùng cho IN ẤN. Kích thước cố định, không đổi theo App, không đổi theo Android System.
   * fixedSize = false (mặc định): Dùng cho UI App. Đổi theo setting của App.
   */
  fixedSize?: boolean;
}

const CustomText: React.FC<CustomTextProps> = ({ style, size = 14, fixedSize = false, ...props }) => {
  const { calcSize } = useFont();

  const flattenStyle = StyleSheet.flatten(style);
  const explicitSize = (flattenStyle?.fontSize as number) || size;

  // 1. Tính toán Size
  // Nếu fixed: Lấy đúng số đó (ví dụ 18). Nếu không: Tính theo tỷ lệ App
  const finalSize = fixedSize ? explicitSize : calcSize(explicitSize);

  return (
    <Text
      {...props}
      // 2. Xử lý Font Scaling của Android System
      // - Nếu fixedSize=true (In ấn): Bắt buộc tắt (false) để Android không tự phóng to làm vỡ giấy in.
      // - Nếu fixedSize=false (UI App): Để mặc định (undefined/true) để nó phối hợp với logic calcSize của bạn.
      allowFontScaling={fixedSize ? false : props.allowFontScaling}
      style={[style, { fontSize: finalSize }]}
    />
  );
};

export default CustomText;
