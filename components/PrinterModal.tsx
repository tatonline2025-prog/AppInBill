import { Text } from "@/components/StyledText";
import { InvoiceInfo } from "@/types/invoice";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface PrinterDevice {
  name: string;
  address: string;
  paperWidthPx?: number;
}

interface PrinterModalProps {
  visible: boolean;
  printers: PrinterDevice[];
  isScanning: boolean;
  isPrinting?: boolean;
  isLayoutVisible?: boolean;
  savedPrinter?: PrinterDevice | null;
  onClose: () => void;
  onScan: () => void;
  onSelectPrinter: (printer: PrinterDevice, invoice?: InvoiceInfo | null) => void;
  currentInvoice?: InvoiceInfo | null;
}

export default function PrinterModal({
  visible,
  printers,
  isScanning,
  isPrinting = false,
  isLayoutVisible = false,
  savedPrinter,
  onClose,
  onScan,
  onSelectPrinter,
  currentInvoice,
}: PrinterModalProps) {
  const [selectedWidth, setSelectedWidth] = useState<384 | 576>(384);

  // Sync width toggle with saved printer's paper width
  useEffect(() => {
    const w = savedPrinter?.paperWidthPx;
    if (w === 384 || w === 576) setSelectedWidth(w);
    else setSelectedWidth(384);
  }, [savedPrinter]);

  const isProcessing = isScanning || isPrinting || isLayoutVisible;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {isPrinting ? "Đang in hóa đơn" : "Chọn máy in Bluetooth"}
          </Text>

          {/* Saved printer hint */}
          {savedPrinter && !isPrinting && !isProcessing && (
            <View style={styles.savedPrinterHint}>
              <Text style={styles.savedPrinterText}>
                💾 Máy in đã lưu: <Text style={styles.savedPrinterName}>{savedPrinter.name}</Text>
              </Text>
            </View>
          )}

          {/* Paper width selector */}
          {!isPrinting && (
            <View style={styles.paperWidthRow}>
              <Text style={styles.paperWidthLabel}>Khổ giấy:</Text>
              <TouchableOpacity
                onPress={() => setSelectedWidth(384)}
                style={[styles.widthBtn, selectedWidth === 384 && styles.widthBtnActive]}
              >
                <Text style={[styles.widthBtnText, selectedWidth === 384 && styles.widthBtnTextActive]}>58mm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedWidth(576)}
                style={[styles.widthBtn, selectedWidth === 576 && styles.widthBtnActive]}
              >
                <Text style={[styles.widthBtnText, selectedWidth === 576 && styles.widthBtnTextActive]}>80mm</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Trạng thái đang xử lý (quét/in/layout) */}
          {isProcessing && (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.scanningText}>
                {isLayoutVisible
                  ? "⏳ Chuẩn bị ảnh hóa đơn..."
                  : isPrinting
                    ? "Đang in, vui lòng chờ..."
                    : "Đang quét..."}
              </Text>
            </View>
          )}

          {/* Danh sách máy in (chỉ hiển thị khi đang quét và không in) */}
          {!isPrinting && (
            <ScrollView style={{ maxHeight: 300, minHeight: 100 }}>
              {!isScanning && printers.length === 0 && (
                <Text style={styles.noPrinterText}>Không tìm thấy máy in nào.</Text>
              )}
              {printers.map((printer, idx) => (
                <TouchableOpacity
                  key={printer.address}
                  onPress={() => onSelectPrinter({ ...printer, paperWidthPx: selectedWidth }, currentInvoice)}
                  style={[styles.printerItem, { borderBottomWidth: idx !== printers.length - 1 ? 1 : 0 }]}
                  disabled={isProcessing}
                >
                  <Text style={styles.printerName}>{printer.name}</Text>
                  <Text style={styles.printerAddress}>{printer.address}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Thông báo đang in */}
          {isPrinting && (
            <View style={styles.printingInfo}>
              <Text style={styles.printingText}>
                ⏳ Vui lòng chờ máy in hoàn tất...
              </Text>
              <Text style={styles.printingSubtext}>
                Không tắt ứng dụng trong khi đang in
              </Text>
            </View>
          )}

          {/* Nút bấm */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.modalButton, styles.closeButton]}
              disabled={isPrinting} // Không cho đóng khi đang in
            >
              <Text style={styles.modalButtonText}>
                {isPrinting ? "Đợi..." : "Đóng"}
              </Text>
            </TouchableOpacity>

            {!isPrinting && (
              <TouchableOpacity
                onPress={onScan}
                disabled={isScanning}
                style={[styles.modalButton, styles.scanButton, isScanning && styles.disabledButton]}
              >
                <Text style={styles.modalButtonText}>
                  {isScanning ? "Đang quét..." : "Quét lại"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  savedPrinterHint: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  savedPrinterText: {
    fontSize: 14,
    color: "#166534",
  },
  savedPrinterName: {
    fontWeight: "600",
  },
  scanningContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  scanningText: {
    marginLeft: 10,
    color: "#475569",
    fontStyle: "italic",
  },
  noPrinterText: {
    textAlign: "center",
    color: "#64748b",
    padding: 20,
  },
  printerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderColor: "#e2e8f0",
  },
  printerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  printerAddress: {
    color: "#64748b",
  },
  printingInfo: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  printingText: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
    marginBottom: 8,
  },
  printingSubtext: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#dc2626",
  },
  scanButton: {
    backgroundColor: "#2563eb",
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  paperWidthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  paperWidthLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginRight: 4,
  },
  widthBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
  },
  widthBtnActive: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  widthBtnText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  widthBtnTextActive: {
    color: "#fff",
  },
});

