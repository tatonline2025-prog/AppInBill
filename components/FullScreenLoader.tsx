// components/FullScreenLoader.tsx
import { Text } from "@/components/StyledText";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface FullScreenLoaderProps {
  visible: boolean;
  message?: string;
}

export default function FullScreenLoader({ visible, message = "Đang tải dữ liệu..." }: FullScreenLoaderProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  container: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    marginLeft: 10,
    fontWeight: "600",
    fontSize: 16,
    color: "#1e293b",
  },
});
