import { AuthProvider, useAuth } from "@/context/AuthContext"; // Đảm bảo đúng đường dẫn file bạn mới tạo
import { FontProvider } from "@/context/FontContext";
import { useFonts } from "expo-font";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, Platform, View } from "react-native";
import FlashMessage from "react-native-flash-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SpInAppUpdates, { IAUUpdateKind } from "sp-react-native-in-app-updates";

SplashScreen.preventAutoHideAsync();

// 1. Component con: Chứa logic điều hướng và giao diện
function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();

  // console.log("Layout State:", { isAuthenticated, loading, segments: segments[0] });

  // 1. Nếu đang loading thì hiện vòng quay, không làm gì cả
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // 2. Xác định các trang cần bảo vệ (Route Guard)
  const inProtectedGroup =
    segments[0] === "(tabs)" || segments[0] === "invoices" || segments[0] === "invoiceLayoutConfigScreen";

  if (!isAuthenticated && inProtectedGroup) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: true,
          headerTitleStyle: { fontFamily: "Roboto-Bold" },
          headerBackTitleStyle: { fontFamily: "Roboto-Regular" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Loading", headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "login", headerShown: false }} />
        <Stack.Screen name="invoices" options={{ title: "invoices", headerShown: false }} />
        <Stack.Screen name="invoiceLayoutConfigScreen" options={{ title: "invoices", headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ title: "Home", headerShown: false }} />
      </Stack>
      <FlashMessage
        position="top"
        statusBarHeight={40}
        titleStyle={{ fontFamily: "Roboto-Bold" }}
        textStyle={{ fontFamily: "Roboto-Regular" }}
      />
    </View>
  );
}

// 2. Root Layout: Chỉ lo việc Load Font, Update App và Bọc Provider
export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
    "Roboto-Bold": require("../assets/fonts/Roboto-Bold.ttf"),
  });

  const isCheckingRef = useRef(false);

  // --- Logic In-App Update (Giữ nguyên của bạn) ---
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const inAppUpdates = new SpInAppUpdates(false); // false = production

    const checkAndUpdate = async () => {
      if (isCheckingRef.current) return;

      try {
        isCheckingRef.current = true; // Đánh dấu bắt đầu check

        const result = await inAppUpdates.checkNeedsUpdate();

        if (result.shouldUpdate) {
          console.log("Update found, starting immediate update...");

          await inAppUpdates.startUpdate({
            updateType: IAUUpdateKind.IMMEDIATE,
          });

          // Lưu ý: Với IMMEDIATE, nếu thành công app sẽ restart.
          // Nếu code chạy xuống đây nghĩa là update đã bị hủy hoặc lỗi.
        }
      } catch (err) {
        console.log("Update check error:", err);
      } finally {
        // 3. Reset cờ sau khi xử lý xong (hoặc khi user hủy update)
        // Để lần sau AppState active thì mới check lại được
        isCheckingRef.current = false;
      }
    };

    checkAndUpdate();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("App moved to foreground, checking for update...");
        checkAndUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <FontProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppNavigator />
        </GestureHandlerRootView>
      </FontProvider>
    </AuthProvider>
  );
}
