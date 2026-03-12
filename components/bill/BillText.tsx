// src/components/BillText.tsx
// import { normalizeFont } from "@/utils/printer"; // Import từ file utils mới
import React from "react";
import { Platform, StyleSheet } from "react-native";
import CustomText from "../CustomText";

const normalizePrintTextStyle = (style: any) => {
  const flat = StyleSheet.flatten(style) || {};
  const normalized: any = { ...flat };

  // Thermal printers render best with system fonts and explicit weights.
  // Map custom Noto families to system fallback to avoid missing/thin glyphs.
  if (flat.fontFamily === "NotoSans-Bold") {
    delete normalized.fontFamily;
    normalized.fontWeight = "700";
  } else if (flat.fontFamily === "NotoSans-Regular") {
    delete normalized.fontFamily;
    normalized.fontWeight = "400";
  }

  return normalized;
};

// Component BillText cơ bản
export const BillText = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <CustomText
    fixedSize={true}
    allowFontScaling={false}
    style={[
      {
        // Use system font for higher compatibility on captured thermal bitmap.
        fontFamily: Platform.OS === "ios" ? "System" : undefined,
        fontSize: 9,
        color: "#000000",
        lineHeight: 12,
        includeFontPadding: false,
      },
      normalizePrintTextStyle(style),
    ]}
  >
    {children}
  </CustomText>
);
