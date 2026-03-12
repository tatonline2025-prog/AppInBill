import { AuthProvider } from "@/context/AuthContext";
import { FontProvider } from "@/context/FontContext";
import { InvoiceProvider } from "@/context/InvoiceContext";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import FlashMessage from "react-native-flash-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
    "Roboto-Bold": require("../assets/fonts/Roboto-Bold.ttf"),
    "NotoSans-Regular": require("../assets/fonts/NotoSans-Regular.ttf"),
    "NotoSans-Bold": require("../assets/fonts/NotoSans-Bold.ttf"),
    "NotoSans-Medium": require("../assets/fonts/NotoSans-Medium.ttf"),
  });

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Show loading screen while fonts are loading
  if (!loaded && !error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <InvoiceProvider>
        <AuthProvider>
          <FontProvider>
            <Stack
              screenOptions={{
                headerShown: true,
                headerTitleStyle: { fontFamily: "Roboto-Bold" },
                headerBackTitleStyle: { fontFamily: "Roboto-Regular" },
                headerStyle: { backgroundColor: "#2563eb" },
                headerTintColor: "#fff",
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="invoices" options={{ headerShown: false }} />
              <Stack.Screen name="invoiceLayoutConfigScreen" options={{ headerShown: false }} />
            </Stack>
            <FlashMessage
              position="top"
              statusBarHeight={40}
              titleStyle={{ fontFamily: "Roboto-Bold" }}
              textStyle={{ fontFamily: "Roboto-Regular" }}
            />
          </FontProvider>
        </AuthProvider>
      </InvoiceProvider>
    </GestureHandlerRootView>
  );
}

