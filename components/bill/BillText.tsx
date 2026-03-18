// src/components/BillText.tsx
import { useFont } from "@/context/FontContext";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import CustomText from "../CustomText";

const normalizePrintTextStyle = (style: any) => {
  const flat = StyleSheet.flatten(style) || {};
  const normalized: any = { ...flat };

  // Keep explicit fontFamily for consistent bold printing across all devices/printers.
  // No fontWeight override - use bundled font files directly.
  if (flat.fontFamily === "NotoSans-Bold") {
    normalized.fontFamily = "NotoSans-Bold";
  } else if (flat.fontFamily === "NotoSans-Regular") {
    normalized.fontFamily = "NotoSans-Regular";
  }

  return normalized;
};

// Component BillText cơ bản - Consistent bold for printing
export const BillText = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const { scale } = useFont();
  const baseFontSize = 9 * scale;
  const lineHeight = 12 * scale;

  return (
    <CustomText
      fixedSize={true}
      allowFontScaling={false}
      style={[
        {
          fontFamily: Platform.OS === "ios" ? "System" : undefined,
          fontSize: baseFontSize,
          color: "#000000",
          lineHeight: lineHeight,
          includeFontPadding: false,
        },
        normalizePrintTextStyle(style),
      ]}
    >
      {children}
    </CustomText>
  );
};
