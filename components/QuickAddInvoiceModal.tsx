import { quickAddInvoice } from "@/api/invoice.api";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { showMessage } from "react-native-flash-message";

interface QuickAddInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickAddInvoiceModal({
  visible,
  onClose,
  onSuccess,
}: QuickAddInvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setInvoiceNumber("");
    setCustomerName("");
    setTotalAmount("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!invoiceNumber.trim()) {
      showMessage({
        message: "Vui lòng nhập mã hóa đơn",
        type: "danger",
      });
      return;
    }

    if (!customerName.trim()) {
      showMessage({
        message: "Vui lòng nhập tên khách hàng",
        type: "danger",
      });
      return;
    }

    if (!totalAmount.trim() || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0) {
      showMessage({
        message: "Vui lòng nhập tổng tiền hợp lệ",
        type: "danger",
      });
      return;
    }

    try {
      setIsLoading(true);
      await quickAddInvoice({
        invoiceNumber: invoiceNumber.trim(),
        customerName: customerName.trim(),
        totalAmount: Number(totalAmount),
      });
      
      showMessage({
        message: "Thêm hóa đơn thành công!",
        type: "success",
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("=== Lỗi thêm hóa đơn chi tiết ===");
      console.error("Error:", error);
      console.error("Response:", error?.response);
      console.error("Data:", error?.response?.data);
      console.error("Message:", error?.response?.data?.message);
      
      const errorMsg = error?.response?.data?.message 
        || error?.message 
        || "Thêm hóa đơn thất bại. Vui lòng kiểm tra console để biết chi tiết.";
      
      showMessage({
        message: errorMsg,
        type: "danger",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Thêm nhanh hóa đơn</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Mã hóa đơn */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Mã hóa đơn <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mã hóa đơn"
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Tên khách hàng */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Tên khách hàng <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên khách hàng"
                value={customerName}
                onChangeText={setCustomerName}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Tổng tiền */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Tổng số tiền chưa thu <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số tiền"
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Thêm</Text>
              )}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  buttons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  submitButton: {
    backgroundColor: "#2563eb",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
