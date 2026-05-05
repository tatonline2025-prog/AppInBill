// components/FullScreenLoader.tsx
import { Text } from "@/components/StyledText";
import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

interface FullScreenLoaderProps {
  visible: boolean;
  message?: string;
  onCancel?: () => void;
}

export default function FullScreenLoader({ visible, message = "Đang tải dữ liệu...", onCancel }: FullScreenLoaderProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>{message}</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>✕</Text>
          </TouchableOpacity>
        )}
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
    gap: 10,
  },
  text: {
    fontWeight: "600",
    fontSize: 16,
    color: "#1e293b",
    flex: 1,
  },
  cancelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
  },
});
