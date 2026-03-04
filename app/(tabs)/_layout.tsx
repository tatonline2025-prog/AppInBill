import FloatingActionButton from "@/components/FloatingActionButton";
import QuickAddInvoiceModal from "@/components/QuickAddInvoiceModal";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets(); // Lấy thông tin vùng an toàn
  const [modalVisible, setModalVisible] = useState(false);

  const handleQuickAddSuccess = () => {
    // Có thể thêm logic refresh ở đây nếu cần
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#64748b",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopColor: "#e2e8f0",
            height: 65 + insets.bottom, // đẩy lên theo safe area
            borderTopWidth: 1,
            paddingBottom: 8 + insets.bottom, // thêm khoảng padding
            paddingTop: 8,
            elevation: 10,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="uncollected"
          options={{
            title: "Hoá Đơn Chưa Thu",
            headerShown: true,
            headerStyle: { backgroundColor: "#2563eb" },
            headerTintColor: "#fff",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "file-tray-full" : "file-tray"} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="collected"
          options={{
            title: "Hoá Đơn Đã Thu",
            headerShown: true,
            headerStyle: { backgroundColor: "#2563eb" },
            headerTintColor: "#fff",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "checkmark-circle" : "checkmark-circle-outline"} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Tài Khoản Của Bạn",
            headerShown: true,
            headerStyle: { backgroundColor: "#2563eb" },
            headerTintColor: "#fff",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Action Button */}
      <FloatingActionButton onPress={() => setModalVisible(true)} />

      {/* Quick Add Invoice Modal */}
      <QuickAddInvoiceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </View>
  );
}
