// --- File: components/uncollected/ui/EditModal.tsx ---
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Định nghĩa các loại dữ liệu có thể sửa
export type FieldType = "text" | "number" | "multiline";

export interface EditSession {
  key: string; // Tên trường trong object (vd: customerName)
  label: string; // Tên hiển thị (vd: Tên khách hàng)
  value: string | number | null; // Giá trị hiện tại
  type: FieldType; // Kiểu dữ liệu
}

interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (key: string, newValue: string | number | null) => void;
  session: EditSession | null;
}

export default function EditModal({ visible, onClose, onSave, session }: EditModalProps) {
  const [tempValue, setTempValue] = useState("");

  // Mỗi khi mở modal (session thay đổi), load giá trị cũ vào state tạm
  useEffect(() => {
    if (session) {
      setTempValue(session.value ? String(session.value) : "");
    }
  }, [session]);

  const handleSave = () => {
    if (!session) return;
    onSave(session.key, tempValue);
    onClose();
  };

  if (!session) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Chỉnh sửa {session.label}</Text>

          <TextInput
            style={[styles.input, session.type === "multiline" && { height: 80, textAlignVertical: "top" }]}
            value={tempValue}
            onChangeText={setTempValue}
            placeholder={`Nhập ${session.label}...`}
            keyboardType={session.type === "number" ? "numeric" : "default"}
            multiline={session.type === "multiline"}
            autoFocus
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnCancel]}>
              <Text style={styles.btnTextCancel}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} style={[styles.btn, styles.btnSave]}>
              <Text style={styles.btnTextSave}>Lưu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1e293b",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f8fafc",
    color: "#334155",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#f1f5f9",
  },
  btnSave: {
    backgroundColor: "#2563eb",
  },
  btnTextCancel: {
    color: "#64748b",
    fontWeight: "600",
  },
  btnTextSave: {
    color: "white",
    fontWeight: "600",
  },
});
