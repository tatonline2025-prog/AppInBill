// --- File: components/ui/InfoRow.tsx ---
import { Text } from "@/components/StyledText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, TextStyle, TouchableOpacity, View } from "react-native";

type InfoRowProps = {
  label: string;
  value: string;
  color?: string;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
};

export default function InfoRow({ label, value, color = "#334155", labelStyle, valueStyle, onPress }: InfoRowProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
        flexWrap: "wrap",
      }}
    >
      <Text allowFontScaling={false} style={[{ fontWeight: "600", color: "#475569", flex: 1 }, labelStyle]}>
        {label}
      </Text>

      <View style={{ flex: 1.6, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
        <Text
          allowFontScaling={false}
          style={[
            {
              color,
              fontWeight: "500",
              textAlign: "right",
              marginRight: onPress ? 4 : 0, // Tạo khoảng trống nhỏ nếu có icon
            },
            valueStyle,
          ]}
          // numberOfLines={1} // giới hạn 1 dòng
          ellipsizeMode="tail"
        >
          {value || "---"}
        </Text>

        {onPress && <MaterialCommunityIcons name="pencil" size={14} color="#007AFF" />}
      </View>
    </Container>
  );
}
