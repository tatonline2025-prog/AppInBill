import { Stack } from "expo-router";

export default function InvoiceLayoutConfigScreenLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#2563eb" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="invoiceformlist"
        options={{
          title: "Điều chỉnh form In hoá đơn",
        }}
      />
    </Stack>
  );
}
