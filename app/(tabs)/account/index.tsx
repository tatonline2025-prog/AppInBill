import { getUserLayoutLocal } from "@/api/invoicelayout.api";
import { changePassword, updateCollectionFee } from "@/api/user.api";
import { DynamicNotiInvoiceLayout } from "@/components/InvoiceLayout";
import { Text } from "@/components/StyledText";
import { useAuth } from "@/context/AuthContext";
import { useFont } from "@/context/FontContext";
import { useInvoices } from "@/context/InvoiceContext";
import { usePrinterSettings } from "@/hooks/usePrinterSettings";
import { InvoiceLayoutItem } from "@/types/invoice-layout";
import { toVietnamISOString } from "@/utils/vnTimezone";
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { showMessage } from "react-native-flash-message";
import { GestureHandlerRootView, TextInput } from "react-native-gesture-handler";
import ViewShot from "react-native-view-shot";

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

  // --- STATE ĐỔI MẬT KHẨU ---
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // --- STATE LAYOUT XEM TRƯỚC ---
  const [previewLayout, setPreviewLayout] = useState<InvoiceLayoutItem[]>(defaultLayout);

  const version = Constants.expoConfig?.version || "1.0.0";

  const viewShotRef = useRef<ViewShot>(null);

  // --- PRINTER SETTINGS ---
  const printerSettings = usePrinterSettings(viewShotRef);

  // --- STATE QUẢN LÝ VIỆC THAY ĐỔI SIZE CHỮ ---
  const { scale, changeScale } = useFont();

  // --- Load layout riêng của user từ AsyncStorage ---
  useEffect(() => {
    if (!user?._id) return;
    getUserLayoutLocal(user._id, "Thông báo điện Lấp Vò")
      .then((saved) => { if (saved) setPreviewLayout(saved); })
      .catch(() => {});
  }, [user?._id]);

  // --- HÀM 1: Mở modal và gán giá trị hiện tại ---
  const openEditModal = () => {
    setNewFee(user?.collectionFee?.toString() || "0");
    setModalVisible(true);
  };

  // --- HÀM ĐỔI MẬT KHẨU ---
  const handleChangePassword = async () => {
    if (!newPw || !oldPw) {
      showMessage({ message: "Vui lòng nhập đầy đủ thông tin", type: "warning" });
      return;
    }
    if (newPw.length < 6) {
      showMessage({ message: "Mật khẩu mới phải ít nhất 6 ký tự", type: "warning" });
      return;
    }
    if (newPw !== confirmPw) {
      showMessage({ message: "Mật khẩu xác nhận không khớp", type: "warning" });
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(oldPw, newPw);
      showMessage({ message: "Đổi mật khẩu thành công!", type: "success" });
      setPwModalVisible(false);
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      showMessage({ message: e?.message || "Không thể đổi mật khẩu", type: "danger" });
    } finally {
      setPwLoading(false);
    }
  };

  const parseFeeValue = (input: string) => {
    const normalized = input.replace(/[^\d]/g, "");
    if (!normalized) return NaN;
    return Number(normalized);
  };

  // --- HÀM 2: Gửi dữ liệu về Backend (CORE LOGIC) ---
  const handleUpdateFee = async () => {
    const parsedFee = parseFeeValue(newFee);
    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      showMessage({ message: "Phí dịch vụ không hợp lệ!", type: "warning" });
      return;
    }

    if (!user) {
      showMessage({ message: "Không xác nhận được người dùng!", type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const res = await updateCollectionFee(user._id, parsedFee);

      if (res.status === 200) {
        showMessage({ message: "Cập nhật phí thành công!", type: "success" });

        await refreshUser();
        await refetchInvoices(); // Refetch để cập nhật collectionFee trong invoice.assignedTo
        setModalVisible(false);
      }
    } catch (error) {
      console.error("Lỗi update fee:", error);
      const fallbackMessage = "Không thể cập nhật phí dịch vụ";
      const errorMessage = error instanceof Error ? error.message : fallbackMessage;
      showMessage({ message: errorMessage || fallbackMessage, type: "danger" });
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
            <Text>{version} - 04/05/2026</Text>

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

        </View>

        {/* Printer Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🖨️ Máy in</Text>

          {/* Status */}
          <View style={[styles.infoRow, { marginBottom: 12 }]}>
            <Text style={styles.infoLabel}>Trạng thái:</Text>
            {printerSettings.savedPrinter ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={styles.statusDotGreen} />
                <Text style={[styles.infoValue, { color: "#16a34a" }]}>
                  {printerSettings.savedPrinter.name}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={styles.statusDotRed} />
                <Text style={{ color: "#dc2626", fontWeight: "500" }}>Chưa cấu hình</Text>
              </View>
            )}
          </View>

          {printerSettings.savedPrinter && (
            <View style={[styles.infoRow, { marginBottom: 12 }]}>
              <Text style={styles.infoLabel}>Khổ giấy:</Text>
              <Text style={styles.infoValue}>
                {printerSettings.savedPrinter.paperWidthPx === 576 ? "80mm" : "58mm"}
              </Text>
            </View>
          )}

          {/* Scan button */}
          <TouchableOpacity
            style={[styles.printerBtn, printerSettings.isScanning && styles.printerBtnDisabled]}
            onPress={printerSettings.scan}
            disabled={printerSettings.isScanning || printerSettings.isTesting}
          >
            {printerSettings.isScanning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="bluetooth-searching" size={18} color="#fff" />
            )}
            <Text style={styles.printerBtnText}>
              {printerSettings.isScanning ? "Đang quét..." : "Quét máy in Bluetooth"}
            </Text>
          </TouchableOpacity>

          {/* Printer list */}
          {printerSettings.availablePrinters.length > 0 && (
            <View style={styles.printerList}>
              <Text style={[styles.infoLabel, { marginBottom: 6 }]}>Chọn máy in:</Text>
              {printerSettings.availablePrinters.map((p) => {
                const isSelected = printerSettings.selectedPrinter?.address === p.address;
                return (
                  <TouchableOpacity
                    key={p.address}
                    style={[styles.printerItem, isSelected && styles.printerItemSelected]}
                    onPress={() => printerSettings.selectPrinter(p)}
                  >
                    <MaterialIcons
                      name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
                      size={18}
                      color={isSelected ? "#2563eb" : "#9ca3af"}
                    />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={{ fontWeight: isSelected ? "700" : "400", color: "#111" }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: "#6b7280" }}>{p.address}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Paper width toggle */}
          <View style={styles.paperWidthRow}>
            <Text style={[styles.infoLabel, { marginBottom: 0, marginRight: 8 }]}>Khổ giấy:</Text>
            <TouchableOpacity
              style={[styles.widthBtn, printerSettings.selectedWidthPx === 384 && styles.widthBtnActive]}
              onPress={() => printerSettings.setSelectedWidthPx(384)}
            >
              <Text style={[styles.widthBtnText, printerSettings.selectedWidthPx === 384 && styles.widthBtnTextActive]}>
                PT · 58mm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.widthBtn, printerSettings.selectedWidthPx === 576 && styles.widthBtnActive]}
              onPress={() => printerSettings.setSelectedWidthPx(576)}
            >
              <Text style={[styles.widthBtnText, printerSettings.selectedWidthPx === 576 && styles.widthBtnTextActive]}>
                Bixolon · 80mm
              </Text>
            </TouchableOpacity>
          </View>

          {/* Điều chỉnh cỡ chữ - dùng chung với xem trước */}
          <View style={[styles.controlContainer, { marginBottom: 12 }]}>
            <Text style={styles.label}>Cỡ chữ: x{scale.toFixed(1)}</Text>
            <View style={styles.sliderRow}>
              <Text style={{ fontSize: 14, fontWeight: "bold" }}>A</Text>
              <Slider
                style={{ flex: 1, height: 40, marginHorizontal: 10 }}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={scale}
                onValueChange={(val: any) => {
                  const roundedVal = parseFloat(val.toFixed(1));
                  changeScale(roundedVal);
                }}
                minimumTrackTintColor="#2ecc71"
                maximumTrackTintColor="#000000"
                thumbTintColor="#2ecc71"
              />
              <Text style={{ fontSize: 24, fontWeight: "bold" }}>A</Text>
            </View>
          </View>

          {/* Xem trước mẫu in - thay đổi theo cỡ chữ và khổ giấy */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Xem trước mẫu in</Text>
            <Text style={styles.previewSubtitle}>(Kéo thanh để chỉnh cỡ chữ & khổ giấy)</Text>
            <View style={styles.paperContainer}>
              <DynamicNotiInvoiceLayout
                forwardedRef={viewShotRef}
                invoice={sampleInvoice as any}
                layout={previewLayout}
                visible={true}
                pixelWidth={printerSettings.selectedWidthPx}
              />
            </View>
          </View>

          {/* Test & Save button */}
          <TouchableOpacity
            style={[
              styles.printerBtn,
              { backgroundColor: "#16a34a" },
              (printerSettings.isTesting || !printerSettings.selectedPrinter) && styles.printerBtnDisabled,
            ]}
            onPress={printerSettings.testAndSave}
            disabled={printerSettings.isTesting || !printerSettings.selectedPrinter}
          >
            {printerSettings.isTesting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="print" size={18} color="#fff" />
            )}
            <Text style={styles.printerBtnText}>
              {printerSettings.isTesting ? "Đang test in..." : "Test in & Lưu cấu hình"}
            </Text>
          </TouchableOpacity>

          {/* Clear config */}
          {printerSettings.savedPrinter && (
            <TouchableOpacity
              style={[styles.printerBtn, { backgroundColor: "#ef4444", marginTop: 6 }]}
              onPress={printerSettings.clearPrinter}
              disabled={printerSettings.isTesting}
            >
              <MaterialIcons name="delete-outline" size={18} color="#fff" />
              <Text style={styles.printerBtnText}>Xóa cấu hình máy in</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push("../../invoices")}>
            <Text style={styles.actionText}>Danh sách hoá đơn phụ trách</Text>
            <MaterialIcons name="chevron-right" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("../../invoiceLayoutConfigScreen/invoiceformlist")}
          >
            <Text style={styles.actionText}>Điều chỉnh form hoá đơn</Text>
            <MaterialIcons name="chevron-right" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => setPwModalVisible(true)}>
            <Text style={styles.actionText}>Đổi mật khẩu</Text>
            <MaterialIcons name="chevron-right" size={20} color="#888" />
          </TouchableOpacity>

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

      {/* --- MODAL ĐỔI MẬT KHẨU --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pwModalVisible}
        onRequestClose={() => setPwModalVisible(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior="height" style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

              <Text style={styles.modalLabel}>Mật khẩu hiện tại:</Text>
              <TextInput
                style={styles.input}
                onChangeText={setOldPw}
                value={oldPw}
                secureTextEntry
                placeholder="Nhập mật khẩu cũ"
                autoFocus
              />

              <Text style={[styles.modalLabel, { marginTop: 10 }]}>Mật khẩu mới:</Text>
              <TextInput
                style={styles.input}
                onChangeText={setNewPw}
                value={newPw}
                secureTextEntry
                placeholder="Tối thiểu 6 ký tự"
              />

              <Text style={[styles.modalLabel, { marginTop: 10 }]}>Xác nhận mật khẩu mới:</Text>
              <TextInput
                style={styles.input}
                onChangeText={setConfirmPw}
                value={confirmPw}
                secureTextEntry
                placeholder="Nhập lại mật khẩu mới"
              />

              <View style={[styles.modalButtons, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => { setPwModalVisible(false); setOldPw(""); setNewPw(""); setConfirmPw(""); }}
                >
                  <Text style={styles.btnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleChangePassword} disabled={pwLoading}>
                  <Text style={[styles.btnText, { color: "white" }]}>{pwLoading ? "Đang lưu..." : "Đổi mật khẩu"}</Text>
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
  },
  // --- Printer Settings ---
  statusDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16a34a",
  },
  statusDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#dc2626",
  },
  printerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  printerBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  printerBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  printerList: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  printerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  printerItemSelected: {
    backgroundColor: "#eff6ff",
  },
  paperWidthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  widthBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
    marginRight: 8,
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
