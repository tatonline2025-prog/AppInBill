// src/components/BillText.tsx
// import { normalizeFont } from "@/utils/printer"; // Import từ file utils mới
import React from "react";
import { Platform } from "react-native";
import CustomText from "../CustomText";

// Component BillText cơ bản
export const BillText = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <CustomText
    allowFontScaling={false}
    style={[
      {
        fontFamily: "NotoSans-Regular",
        fontSize: 9,
        color: "#000000",
        lineHeight: 9 * 1.4,
        includeFontPadding: Platform.OS === "android",
      },
      style,
    ]}
  >
    {children}
  </CustomText>
);
