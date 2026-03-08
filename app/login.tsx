// app/login.tsx
import { login } from "@/api/auth.api";
import { Text, TextInput } from "@/components/StyledText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { showMessage } from "react-native-flash-message";

// Sử dụng useAuth từ Context
import { useAuth } from "@/context/AuthContext";

const REMEMBER_ME_KEY = "rememberMe";
const SAVED_USERNAME_KEY = "savedUsername";
// ✅ Đã xóa SAVED_PASSWORD_KEY vì lưu mật khẩu vào AsyncStorage là không an toàn

export default function Login() {
  const router = useRouter();

  // 2. Lấy hàm refreshUser từ Context
  const { refreshUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // ✅ Chỉ load username, KHÔNG load password vì lý do bảo mật
        const storedUsername = await AsyncStorage.getItem(SAVED_USERNAME_KEY);
        const storedRememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);

        if (storedRememberMe === "true" && storedUsername) {
          setUsername(storedUsername);
          setRememberMe(true);
        }
      } catch (e) {
        console.error("Lỗi khi load thông tin đăng nhập:", e);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    try {
      if (!username || !password) {
        showMessage({
          message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
          type: "warning",
          icon: "warning",
        });
        return;
      }

      const res = await login(username.trim(), password.trim());

      if (res?.status === 200 && res?.data) {
        // Lưu/Xóa thông tin Remember Me sau khi đăng nhập thành công ---
        if (rememberMe) {
          // ✅ Chỉ lưu username, KHÔNG lưu password vì lý do bảo mật
          await AsyncStorage.setItem(SAVED_USERNAME_KEY, username.trim());
          await AsyncStorage.setItem(REMEMBER_ME_KEY, "true");
        } else {
          // Xóa thông tin đã lưu nếu người dùng bỏ chọn
          await AsyncStorage.removeItem(SAVED_USERNAME_KEY);
          await AsyncStorage.setItem(REMEMBER_ME_KEY, "false"); // Set trạng thái là false
        }
        // ----------------------------------------------------------------------

        showMessage({
          message: "Đăng nhập thành công!",
          type: "success",
          icon: "success",
        });

        await AsyncStorage.setItem("token", res.data.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.data.user));

        // Đợi refreshUser hoàn thành trước khi redirect
        await refreshUser();

        router.replace("/(tabs)/uncollected");
      }
    } catch (error: any) {
      console.error("Lỗi đăng nhập:", error);
      if (error.status === 401 || (error.response && error.response.status === 401)) {
        showMessage({
          message: error.response?.data?.message || "Sai tên đăng nhập hoặc mật khẩu",
          type: "danger",
          icon: "danger",
        });
      } else {
        showMessage({
          message: "Có lỗi xảy ra, vui lòng thử lại.",
          type: "danger",
          icon: "danger",
        });
      }
    }
  };

  const toggleRememberMe = () => {
    setRememberMe((prev) => !prev);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ... code giao diện cũ ... */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: "700",
            color: "#1e293b",
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          Hệ Thống Thu Hoá Đơn TAT
        </Text>

        <Text
          style={{
            fontSize: 20,
            color: "#64748b",
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          Đăng nhập
        </Text>

        <TextInput
          placeholder="Tên đăng nhập"
          placeholderTextColor="#94a3b8"
          style={{
            width: "100%",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            padding: 12,
            borderRadius: 10,
            marginBottom: 15,
            fontSize: 16,
            color: "#000",
          }}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Mật khẩu"
          placeholderTextColor="#94a3b8"
          style={{
            width: "100%",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            padding: 12,
            borderRadius: 10,
            marginBottom: 25,
            fontSize: 16,
            color: "#000",
          }}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={toggleRememberMe}
          style={{
            flexDirection: "row",
            alignSelf: "flex-start", // Đặt ở bên trái
            alignItems: "center",
            marginBottom: 25,
          }}
        >
          {/* Checkbox giả bằng View/Text */}
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              borderWidth: 2,
              borderColor: "#2563eb",
              backgroundColor: rememberMe ? "#2563eb" : "#fff",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            {rememberMe && (
              <Text
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                ✓
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 16, color: "#64748b" }}>Ghi nhớ người dùng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          style={{
            width: "100%",
            backgroundColor: "#2563eb",
            paddingVertical: 14,
            borderRadius: 10,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "#fff",
              fontWeight: "600",
              fontSize: 18,
            }}
          >
            Đăng nhập
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
