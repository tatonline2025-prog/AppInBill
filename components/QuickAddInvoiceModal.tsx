import { quickAddInvoice } from "@/api/invoice.api";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
  const prefixOptions = ["PB070900", "PB070700", "PB050900"];
  const [selectedPrefix, setSelectedPrefix] = useState(prefixOptions[0]);
  const [invoiceSuffix, setInvoiceSuffix] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
const [isLoading, setIsLoading] = useState(false);
  const [isValidSuffix, setIsValidSuffix] = useState(false);

  const resetForm = () => {
    setSelectedPrefix(prefixOptions[0]);
    setInvoiceSuffix("");
    setCustomerName("");
    setTotalAmount("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    const trimmed = invoiceSuffix.trim();
    const regex = /^\d{5}$/;
    setIsValidSuffix(regex.test(trimmed));
  }, [invoiceSuffix]);

  const fullPreview = `${selectedPrefix}${invoiceSuffix.padEnd(5, ' ')}`;

  const handleSubmit = async () => {
    const trimmedSuffix = invoiceSuffix.trim();
    const fullInvoiceNumber = `${selectedPrefix}${trimmedSuffix}`;

    if (!isValidSuffix) {
      showMessage({
        message: `Mã hóa đơn không hợp lệ. Cần đúng 5 chữ số. Preview: ${fullPreview}`,
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
        invoiceNumber: fullInvoiceNumber,
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
      console.error('[QuickAdd] Full error:', error.response?.data || error);
      const errorMsg = error?.response?.data?.message 
        || error?.message 
        || "Thêm hóa đơn thất bại.";
      
      showMessage({
        message: errorMsg,
        type: "danger",
        duration: 5000,
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
          <View style={styles.header}>
            <Text style={styles.title}>Thêm nhanh hóa đơn</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
Mã khách hàng (chọn prefix + 5 số cuối) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.prefixRow}>
                {prefixOptions.map((prefix) => {
                  const isSelected = prefix === selectedPrefix;
                  return (
                    <TouchableOpacity
                      key={prefix}
                      style={[styles.prefixButton, isSelected && styles.prefixButtonSelected]}
                      onPress={() => setSelectedPrefix(prefix)}
                    >
                      <Text style={[styles.prefixButtonText, isSelected && styles.prefixButtonTextSelected]}>
                        {prefix}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: isValidSuffix ? '#16a34a' : '#ef4444',
                    backgroundColor: isValidSuffix ? '#f0fdf4' : '#fef2f2',
                  }
                ]}
                placeholder="Nhập đúng 5 số cuối (VD: 12345)"
                value={invoiceSuffix}
                onChangeText={setInvoiceSuffix}
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                maxLength={5}
              />
              {invoiceSuffix.length > 0 && (
                <Text style={{ fontSize: 12, color: isValidSuffix ? '#16a34a' : '#ef4444', marginTop: 4 }}>
                  {isValidSuffix ? '✓ OK' : `❌ Cần đúng 5 số. Preview: ${fullPreview}`}
                </Text>
              )}
            </View>

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

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button, 
                styles.submitButton,
                { opacity: isLoading || !isValidSuffix ? 0.6 : 1 }
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !isValidSuffix}
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
  prefixRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  prefixButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  prefixButtonSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  prefixButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  prefixButtonTextSelected: {
    color: "#1d4ed8",
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
