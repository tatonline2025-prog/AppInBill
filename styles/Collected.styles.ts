import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // Container chính
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  // Thanh tìm kiếm
  textInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Box gợi ý
  suggestionContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 180,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderColor: "#f1f5f9",
  },
  suggestionTextCode: {
    fontWeight: "600",
    color: "#2563eb",
  },
  suggestionTextName: {
    color: "#475569",
  },
  // Chi tiết hoá đơn
  invoiceDetailContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoRowLabel: {
    fontWeight: "600",
    color: "#475569",
  },
  infoRowValue: {
    color: "#334155",
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  printButton: {
    backgroundColor: "#16a34a", // Xanh lá
  },
  revertButton: {
    backgroundColor: "#f59e0b", // Vàng
  },
  // Modal chọn máy in
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
  modalButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#dc2626", // Đỏ
  },
  scanButton: {
    backgroundColor: "#2563eb", // Xanh
  },
  disabledButton: {
    backgroundColor: "#94a3b8", // Xám
  },
  datePickerButton: {
    backgroundColor: "#e0f2fe",
    borderColor: "#38bdf8",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  datePickerText: {
    color: "#0369a1",
    fontWeight: "600",
    fontSize: 16,
  },
});
