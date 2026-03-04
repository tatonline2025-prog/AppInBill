// app/account/_layout.tsx
import { Slot } from "expo-router";

export default function AccountLayout() {
  return (
    // <Stack
    //   screenOptions={{
    //     headerShown: true,
    //   }}
    // >
    //   <Stack.Screen
    //     name="index"
    //     options={{ title: "Tài khoản của bạn", headerStyle: { backgroundColor: "#2563eb" }, headerTintColor: "#fff" }}
    //   />
    // </Stack>
    <Slot />
  );
}
