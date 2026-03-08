// app/index.tsx
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function AuthWrapperScreen() {
  const { isAuthenticated, loading, error } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected) return;
    
    // Only redirect when loading is complete
    if (loading) {
      console.log("Auth: Still loading...");
      return;
    }

    console.log("Auth: Loading complete", { isAuthenticated, error });
    setHasRedirected(true);

    // Small delay to ensure navigation works properly
    setTimeout(() => {
      if (isAuthenticated) {
        console.log("Auth: Redirecting to tabs");
        router.replace("/(tabs)/uncollected");
      } else {
        console.log("Auth: Redirecting to login");
        router.replace("/login");
      }
    }, 100);

  }, [loading, isAuthenticated, error, router, hasRedirected]);

  // Show loading while waiting for auth check
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{ marginTop: 16, color: "#666" }}>Đang tải...</Text>
      {error && <Text style={{ marginTop: 8, color: "red", fontSize: 12 }}>{error}</Text>}
    </View>
  );
}

