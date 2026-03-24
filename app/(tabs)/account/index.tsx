import { updateCollectionFee } from "@/api/user.api";
import { DynamicNotiInvoiceLayout } from "@/components/InvoiceLayout";
import { Text } from "@/components/StyledText";
import { useAuth } from "@/context/AuthContext";
import { useFont } from "@/context/FontContext";
import { useInvoices } from "@/context/InvoiceContext";
import { InvoiceLayoutItem } from "@/types/invoice-layout";
import { toVietnamISOString } from "@/utils/vnTimezone";
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { showMessage } from "react-native-flash-message";
import { GestureHandlerRootView, TextInput } from "react-native-gesture-handler";

const sampleInvoice = {
  invoiceNumber: "PA25001234567", // Mã KH
  customerName: "Nguyễn Văn A",
  customerAddress: "Ấp Bình Lợi, Xã Bình Thạnh, Lấp Vò",
  customerPhone: "0909.123.456",
  recordBookCode: "K09X-XXXX",

  billing_period: "10/2025",
  dateRange: "15/09/2025 - 14/10/2025",

  electricityCost: 450000,
  taxAmount: 45000,
  totalAmount: 495000,

  assignedTo: {
    fullName: "Tên Nhân Viên",
    phone: "09xxxx",
    collectionFee: 3000,
  },
  createdAt: toVietnamISOString(),
};

const defaultLayout: InvoiceLayoutItem[] = [
  { id: "companyInfo", label: "CÔNG TY ĐIỆN LỰC LẤP VÒ", visible: true },
  { id: "header", label: "THÔNG BÁO TIỀN ĐIỆN", visible: true },
  { id: "billingPeriod", label: "Kỳ", visible: true },
{ id: "dateRange", label: "Thời gian", visible: true },
  { id: "customerName", label: "Tên KH", visible: true },
  { id: "customerAddress", label: "Địa chỉ", visible: true },
  { id: "customerCode", label: "Mã KH", visible: true },
  { id: "referenceCode", label: "Trạm", visible: true },
  { id: "totalAmountNumber", label: "Tổng tiền", visible: true },
  { id: "collectionFee", label: "Phí dịch vụ", visible: true },
  { id: "totalCollection", label: "Tổng thu", visible: true },
  { id: "collectorSeparator", label: "----------------", visible: true },
  { id: "collectorName", label: "Nhân viên", visible: true },
  { id: "collectorPhone", label: "SĐT", visible: true },
  { id: "topDateTime", label: "Ngày giờ", visible: true },
  {
    id: "note",
    label:
      "Lưu ý: Thông báo này không có giá trị thay thế Biên nhận thanh toán. Quý khách cần lấy Biên nhận khi đã thanh toán.",
    visible: true,
  },
  { id: "footer", label: "Đề nghị quý khách hàng thanh toán đúng hạn", visible: true },
];

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { refetchInvoices } = useInvoices();
  const router = useRouter();

  // --- STATE QUẢN LÝ VIỆC SỬA PHÍ ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newFee, setNewFee] = useState("");
  const [loading, setLoading] = useState(false);

  const version = Constants.expoConfig?.version || "1.0.0";

  const viewShotRef = useRef(null);

  // --- STATE QUẢN LÝ VIỆC THAY ĐỔI SIZE CHỮ ---
  const { scale, changeScale } = useFont();

  // --- HÀM 1: Mở modal và gán giá trị hiện tại ---
  const openEditModal = () => {
    setNewFee(user?.collectionFee?.toString() || "0");
    setModalVisible(true);
  };

  // --- HÀM 2: Gửi dữ liệu về Backend (CORE LOGIC) ---
  const handleUpdateFee = async () => {
    if (!newFee) {
      showMessage({ message: "Vui lòng nhập số tiền!", type: "warning" });
      return;
    }

    if (!user) {
      showMessage({ message: "Không xác nhận được người dùng!", type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const res = await updateCollectionFee(user?._id, Number(newFee));

      // console.log(res.data.user.collectionFee);

      if (res.status === 200) {
        showMessage({ message: "Cập nhật phí thành công!", type: "success" });

        await refreshUser();
        await refetchInvoices(); // Refetch để cập nhật collectionFee trong invoice.assignedTo
        setModalVisible(false);
      }
    } catch (error) {
      console.error("Lỗi update fee:", error);
      showMessage({ message: "Lỗi kết nối hoặc phiên đăng nhập hết hạn!", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={[styles.infoRow, { marginBottom: -3 }]}>
            <Text>Phiên bản ứng dụng:</Text>
            <Text>{version} - 19/12/2025</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cá nhân</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ tên:</Text>
            <Text style={styles.infoValue}>{user?.fullName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên đăng nhập:</Text>
            <Text style={styles.infoValue}>{user?.username}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vai trò:</Text>
            <Text style={styles.infoValue}>{user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}</Text>
          </View>

          {/* --- DÒNG SỬA PHÍ DỊCH VỤ --- */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phí dịch vụ:</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.infoValue, { color: "#2ecc71", fontWeight: "bold" }]}>
                {Number(user?.collectionFee || 0).toLocaleString("vi-VN")} đ
              </Text>

              {/* Nút bấm để sửa */}
              <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
                <MaterialIcons name="edit" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.container}>
            {/* --- KHU VỰC ĐIỀU KHIỂN SLIDER (Thay thế nút bấm cũ) --- */}
            <View style={styles.controlContainer}>
              <Text style={styles.label}>Điều chỉnh cỡ chữ: x{scale.toFixed(1)}</Text>

              <View style={styles.sliderRow}>
                {/* Icon chữ nhỏ bên trái */}
                <Text style={{ fontSize: 14, fontWeight: "bold" }}>A</Text>

                <Slider
                  style={{ flex: 1, height: 40, marginHorizontal: 10 }}
                  minimumValue={0.5} // Nhỏ nhất
                  maximumValue={2.0} // Lớn nhất
                  step={0.1} // Mỗi lần kéo nhảy 0.1 (1.1 -> 1.2)
                  value={scale} // Giá trị hiện tại lấy từ Context
                  onValueChange={(val: any) => {
                    // Làm tròn số để tránh bị số lẻ kiểu 1.20000001
                    const roundedVal = parseFloat(val.toFixed(1));
                    changeScale(roundedVal);
                  }}
                  minimumTrackTintColor="#2ecc71" // Màu thanh đã kéo (Xanh lá)
                  maximumTrackTintColor="#000000" // Màu thanh chưa kéo (Đen)
                  thumbTintColor="#2ecc71" // Màu nút tròn để kéo
                />

                {/* Icon chữ lớn bên phải */}
                <Text style={{ fontSize: 24, fontWeight: "bold" }}>A</Text>
              </View>
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Xem trước mẫu in</Text>
            <Text style={styles.previewSubtitle}>(Kéo thanh trượt để chỉnh cỡ chữ)</Text>

            <View style={styles.paperContainer}>
              {/* Component in hóa đơn Lấp Vò */}
              <DynamicNotiInvoiceLayout
                forwardedRef={viewShotRef}
                invoice={sampleInvoice as any}
                layout={defaultLayout}
                visible={true}
              />
            </View>
          </View>
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push("../../invoices")}>
            <Text style={styles.actionText}>Danh sách hoá đơn phụ trách</Text>
            <MaterialIcons name="chevron-right" size={20} color="#888" />
          </TouchableOpacity>

          {user?.role === "admin" && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("../../invoiceLayoutConfigScreen/invoiceformlist")}
            >
              <Text style={styles.actionText}>Điều chỉnh form hoá đơn</Text>
              <MaterialIcons name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionRow} onPress={logout}>
            <Text style={[styles.actionText, { color: "red" }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- MODAL NHẬP LIỆU --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        {/* 2. BỌC GestureHandlerRootView NGAY BÊN TRONG MODAL */}
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior="height" style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Cập nhật phí dịch vụ</Text>

              <Text style={styles.modalLabel}>Nhập mức phí mới (VNĐ):</Text>
              <TextInput
                style={styles.input}
                onChangeText={setNewFee}
                value={newFee}
                keyboardType="numeric"
                placeholder="Ví dụ: 5000"
                autoFocus
              />

              <Text style={{ fontSize: 12, color: "#888", marginTop: 4, marginBottom: 10 }}>
                *Lưu ý: Phí dịch vụ bằng 0 sẽ không hiển thị khi in.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleUpdateFee} disabled={loading}>
                  <Text style={[styles.btnText, { color: "white" }]}>{loading ? "Đang lưu..." : "Lưu thay đổi"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "#7C3AED",
    paddingVertical: 30,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "white",
  },
  name: { marginTop: 10, fontSize: 18, fontWeight: "bold", color: "white" },
  userId: { fontSize: 12, color: "#E9D5FF" },

  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 2px 6px rgba(0,0,0,0.05)",
    elevation: 2,
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 8,
    fontSize: 16,
    color: "#333",
  },
  row: { flexDirection: "row", alignItems: "center" },

  copyBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyText: { color: "white", fontWeight: "bold" },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: { color: "#666" },
  infoValue: { fontWeight: "500", color: "#111" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  actionText: { fontSize: 15, color: "#333" },

  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "white",
    paddingVertical: 8,
    justifyContent: "space-around",
  },
  navItem: { alignItems: "center" },
  navLabel: { fontSize: 12, marginTop: 2, color: "#333" },

  editBtn: {
    backgroundColor: "#3498db",
    padding: 6,
    borderRadius: 20,
    marginLeft: 10,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  modalLabel: { alignSelf: "flex-start", marginBottom: 5, color: "#666" },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    backgroundColor: "#f9f9f9",
  },
  modalButtons: { flexDirection: "row", width: "100%", justifyContent: "space-between" },
  btn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },

  btnCancel: { backgroundColor: "#eee" },
  btnSave: { backgroundColor: "#2ecc71" },
  btnText: { fontWeight: "bold", color: "#333" },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  pickerLabel: { fontSize: 14, color: "#555" },
  picker: { flex: 1, height: 40, marginLeft: 10, paddingHorizontal: 0 },
  scaleDisplayBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  scaleDisplayText: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 5,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  scaleModalView: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  scaleOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedOption: {
    backgroundColor: "#f5f5ff",
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonGroup: {
    gap: 10,
    marginTop: 20,
  },
  controlContainer: {
    backgroundColor: "#f5f5f5", // Nền xám nhẹ cho khu vực điều khiển nổi bật
    padding: 20,
    borderRadius: 15,
  },
  label: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center", // Căn giữa icon A nhỏ, Slider và icon A lớn
    justifyContent: "space-between",
  },
  previewSection: { alignItems: "center", marginBottom: 20 },
  previewTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 4 },
  previewSubtitle: { fontSize: 12, color: "#888", marginBottom: 10 },
  paperContainer: {
    backgroundColor: "white",
    padding: 10,
    width: "100%",
    maxWidth: 400, // Giới hạn chiều rộng cho đẹp
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
    overflow: "hidden", // Tránh nội dung tràn ra bo góc
  },
});
