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
import { Ionicons } from "@expo/vector-icons";

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
  const [showPassword, setShowPassword] = useState(false);

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
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Title block */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: "#2563eb",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
              shadowColor: "#2563eb",
              shadowOpacity: 0.5,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <Ionicons name="document-text" size={36} color="#fff" />
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: "#ffffff",
              letterSpacing: 0.5,
            }}
          >
            Hóa Đơn TAT
          </Text>
          <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
            Đăng nhập để tiếp tục
          </Text>
        </View>

        {/* Input card */}
        <View
          style={{
            width: "100%",
            backgroundColor: "#1e293b",
            borderRadius: 16,
            padding: 20,
            gap: 14,
          }}
        >
          {/* Username */}
          <View>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: "600" }}>
              Tên đăng nhập
            </Text>
            <TextInput
              placeholder="Nhập tên đăng nhập"
              placeholderTextColor="#475569"
              style={{
                backgroundColor: "#0f172a",
                borderWidth: 1,
                borderColor: "#334155",
                padding: 13,
                borderRadius: 10,
                fontSize: 15,
                color: "#f1f5f9",
              }}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: "600" }}>
              Mật khẩu
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#0f172a",
                borderWidth: 1,
                borderColor: "#334155",
                borderRadius: 10,
              }}
            >
              <TextInput
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#475569"
                style={{
                  flex: 1,
                  padding: 13,
                  fontSize: 15,
                  color: "#f1f5f9",
                }}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ paddingHorizontal: 14, paddingVertical: 13 }}
                activeOpacity={0.7}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember me */}
          <TouchableOpacity
            onPress={toggleRememberMe}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 2,
                borderColor: "#2563eb",
                backgroundColor: rememberMe ? "#2563eb" : "transparent",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={{ fontSize: 14, color: "#94a3b8" }}>Ghi nhớ người dùng</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            style={{
              backgroundColor: "#2563eb",
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              marginTop: 4,
              shadowColor: "#2563eb",
              shadowOpacity: 0.4,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
