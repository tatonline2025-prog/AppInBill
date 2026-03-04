// app/index.tsx
// import { useAuth } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AuthWrapperScreen() {
  // Lấy trạng thái Auth từ Context
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Chỉ chạy khi quá trình check token ban đầu đã hoàn tất
    if (loading) return;

    // Logic điều hướng (Tương tự như AppNavigator.useEffect)
    if (isAuthenticated) {
      // Đã đăng nhập -> Vào trang chính
      router.replace("/(tabs)/uncollected");
    } else {
      // Chưa đăng nhập -> Vào trang Login
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Vẫn hiển thị loading trong khi chờ Context check token
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
