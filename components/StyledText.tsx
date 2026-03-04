import React from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  TextProps as RNTextProps,
  StyleSheet,
} from "react-native";

const FONTS = {
  regular: "Roboto-Regular",
  bold: "Roboto-Bold",
};

// --- Xử lý cho Text ---
export const Text = (props: RNTextProps) => {
  // Lấy style gốc
  const { style, ...otherProps } = props;

  // Kiểm tra xem người dùng có truyền fontWeight 'bold' vào không
  // (Logic này giúp sửa lỗi font bị mờ trên Android)
  const incomingStyle = StyleSheet.flatten(style) as Record<string, any>;
  const isBold = incomingStyle?.fontWeight === "bold" || incomingStyle?.fontWeight === "700";

  return (
    <RNText
      {...otherProps}
      style={[
        {
          fontFamily: isBold ? FONTS.bold : FONTS.regular,
          // Reset fontWeight để tránh Android tự làm đậm đè lên font
          fontWeight: undefined,
        },
        style,
      ]}
      allowFontScaling={false} // Chặn phóng to chữ theo cài đặt máy (nếu muốn)
    />
  );
};

// --- Xử lý cho TextInput ---
export const TextInput = (props: RNTextInputProps) => {
  const { style, ...otherProps } = props;
  return <RNTextInput {...otherProps} style={[{ fontFamily: FONTS.regular }, style]} allowFontScaling={false} />;
};
