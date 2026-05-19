import { getInvoiceLayout, getUserLayoutLocal, saveUserLayoutLocal } from "@/api/invoicelayout.api";
import { DynamicInvoiceLayout, DynamicNotiInvoiceLayout } from "@/components/InvoiceLayout";
import { Text, TextInput } from "@/components/StyledText";
import { useAuth } from "@/context/AuthContext";
import { InvoiceLayoutItem } from "@/types/invoice-layout";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import ViewShot from "react-native-view-shot";

interface LayoutItem {
  id: string;
  label: string;
  visible: boolean;
}

interface InvoiceLayout {
  _id: string;
  layout: LayoutItem[];
  updatedAt: string;
  lastEditedBy?: {
    username?: string;
  };
  templateType: string;
}

const sampleInvoice = {
  invoiceNumber: "KH123456",
  customerName: "Nguyễn Văn A",
  customerAddress: "123 Lê Lợi, Q.1, TP.HCM",
  billing_period: "10/2025",
  currentAmount: 150000,
  previousAmount: 100000,
  totalAmount: 250000,
  collectionFee: 10000,
  assignedTo: {
    fullName: "Trần Thị B",
    phone: "0909123456",
    collectionFee: 10000,
  },
};

export default function InvoiceLayoutScreen() {
  const { user } = useAuth();
  const [forms, setForms] = useState<InvoiceLayout[]>([]);
  const [layout, setLayout] = useState<InvoiceLayoutItem[]>();
  const [loading, setLoading] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [templateType, settemplateType] = useState<string>("");

  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getInvoiceLayout();
        if (!data) return;

        // Với mỗi form, nếu user có layout riêng trong AsyncStorage thì merge vào
        if (user?._id) {
          const merged = await Promise.all(
            data.map(async (form: InvoiceLayout) => {
              const saved = await getUserLayoutLocal(user._id, form.templateType);
              if (saved) {
                // Ghép: dùng cấu trúc từ backend nhưng apply label/visible từ bản lưu của user
                const savedMap = new Map(saved.map((s) => [s.id, s]));
                const mergedLayout = form.layout.map((item: LayoutItem) => {
                  const userItem = savedMap.get(item.id);
                  return userItem ? { ...item, label: userItem.label, visible: userItem.visible } : item;
                });
                return { ...form, layout: mergedLayout };
              }
              return form;
            })
          );
          setForms(merged);
        } else {
          setForms(data);
        }
      } catch (error) {
        console.error("Lỗi khi lấy layout:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?._id]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const updateLabel = (formId: string, fieldId: string, newLabel: string) => {
    setForms((prev) =>
      prev.map((f) =>
        f._id === formId
          ? {
              ...f,
              layout: f.layout.map((l) => (l.id === fieldId ? { ...l, label: newLabel } : l)),
            }
          : f
      )
    );
  };

  const toggleFieldVisible = (formId: string, fieldId: string) => {
    setForms((prev) =>
      prev.map((f) =>
        f._id === formId
          ? {
              ...f,
              layout: f.layout.map((l) => (l.id === fieldId ? { ...l, visible: !l.visible } : l)),
            }
          : f
      )
    );
  };

  const handleSave = async (form: InvoiceLayout) => {
    try {
      if (!user?._id) {
        Alert.alert("Lỗi", "Không xác định được người dùng.");
        return;
      }
      await saveUserLayoutLocal(user._id, form.templateType, form.layout);
      Alert.alert("Thành công", "Đã lưu cấu hình form của bạn!");
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể lưu cấu hình.");
    }
  };

  const renderItem = ({ item }: { item: InvoiceLayout }) => {
    const isExpanded = expandedId === item._id;
    const headerLabel = item.layout.find((f) => f.id === "header")?.label || "Mẫu hoá đơn";

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => toggleExpand(item._id)}>
          <Text style={styles.header}>{headerLabel}</Text>
          <Text style={styles.sub}>Cập nhật: {new Date(item.updatedAt).toLocaleString("vi-VN")}</Text>
          {item.lastEditedBy?.username && <Text style={styles.sub}>Người sửa: {item.lastEditedBy.username}</Text>}
        </TouchableOpacity>

        {isExpanded && (
          <ScrollView style={styles.detailContainer}>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>
              * Bật/tắt để ẩn/hiện khi in. Sửa nhãn để đổi tên hiển thị.
            </Text>
            {item.layout.map((f) => (
              <View key={f.id} style={[styles.fieldRow, { opacity: f.visible ? 1 : 0.45 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <TouchableOpacity
                    onPress={() => toggleFieldVisible(item._id, f.id)}
                    style={{
                      width: 36, height: 20, borderRadius: 10,
                      backgroundColor: f.visible ? "#007AFF" : "#ccc",
                      justifyContent: "center",
                      alignItems: f.visible ? "flex-end" : "flex-start",
                      paddingHorizontal: 2,
                      marginRight: 8,
                    }}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" }} />
                  </TouchableOpacity>
                  <Text style={[styles.fieldLabel, { flex: 1 }]}>{f.id}</Text>
                </View>
                <TextInput
                  style={[styles.input, !f.visible && { color: "#aaa" }]}
                  value={f.label}
                  onChangeText={(text) => updateLabel(item._id, f.id, text)}
                  editable={f.visible}
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 1 }]}
                onPress={() => {
                  settemplateType(item.templateType);
                  setLayout(item.layout);
                  setPreviewVisible(true);
                }}
              >
                <Text style={styles.saveButtonText}>Xem trước</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveButton, { flex: 1 }]} onPress={() => handleSave(item)}>
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Đang tải danh sách form...</Text>
      </View>
    );
  }

  if (forms.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, color: "#888", textAlign: "center", paddingHorizontal: 24 }}>
          Không tìm thấy mẫu hoá đơn nào.{"\n"}Vui lòng kiểm tra kết nối mạng và thử lại.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={forms}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />

      <Modal visible={previewVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.previewContainer}>
            <Text style={{ textAlign: "center", fontSize: 12, color: "#555", paddingTop: 10 }}>
              Mẫu: {templateType}
            </Text>
            <ScrollView contentContainerStyle={{ alignItems: "center", paddingVertical: 20 }}>
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 10,
                  padding: 10,
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowRadius: 5,
                  elevation: 3,
                }}
              >
                {layout && templateType.toLowerCase().includes("biên nhận") && (
                  <DynamicInvoiceLayout
                    forwardedRef={viewShotRef}
                    invoice={sampleInvoice as any}
                    layout={layout}
                    visible={true}
                  />
                )}

                {layout && templateType.toLowerCase().includes("thông báo") && (
                  <DynamicNotiInvoiceLayout
                    forwardedRef={viewShotRef}
                    invoice={sampleInvoice as any}
                    layout={layout}
                    visible={true}
                  />
                )}

                {layout && !templateType.toLowerCase().includes("biên nhận") && !templateType.toLowerCase().includes("thông báo") && (
                  <Text style={{ color: "#888", padding: 20 }}>
                    Không nhận dạng được mẫu: &quot;{templateType}&quot;
                  </Text>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closePreviewButton} onPress={() => setPreviewVisible(false)}>
              <Text style={styles.closePreviewText}>Đóng xem trước</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    marginBottom: 16,
    elevation: 3,
  },
  header: { fontSize: 18, fontWeight: "bold", color: "#222" },
  sub: { fontSize: 13, color: "#666" },
  detailContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 },
  fieldRow: { marginBottom: 10 },
  fieldLabel: { fontSize: 14, color: "#555", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    backgroundColor: "#fafafa",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  closePreviewButton: { marginTop: 16, backgroundColor: "#f44336", paddingVertical: 10, borderRadius: 8, width: "60%" },
  closePreviewText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  previewContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "90%",
    maxHeight: "85%",
  },
});
