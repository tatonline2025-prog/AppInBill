import { Text } from "@/components/StyledText";
import { InvoiceInfo } from "@/types/invoice";
import React from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface PrinterDevice {
  name: string;
  address: string;
}

interface PrinterModalProps {
  visible: boolean;
  printers: PrinterDevice[];
  isScanning: boolean;
  isPrinting?: boolean;
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
  onClose,
  onScan,
  onSelectPrinter,
  currentInvoice,
}: PrinterModalProps) {
  const isProcessing = isScanning || isPrinting;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {isPrinting ? "Đang in hóa đơn" : "Chọn máy in Bluetooth"}
          </Text>

          {/* Trạng thái đang xử lý (quét hoặc in) */}
          {isProcessing && (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.scanningText}>
                {isPrinting ? "Đang in, vui lòng chờ..." : "Đang quét..."}
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
                  onPress={() => onSelectPrinter(printer, currentInvoice)}
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
    marginBottom: 10,
    textAlign: "center",
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
});

