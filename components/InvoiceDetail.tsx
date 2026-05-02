import { Text } from "@/components/StyledText";
import { useAuth } from "@/context/AuthContext";
import { InvoiceInfo } from "@/types/invoice";
import { useEffect, useRef, useState } from "react";
import { StyleProp, TextStyle, TouchableOpacity, View } from "react-native";
// Import styles từ file styles chung của màn hình
import { updateInvoice } from "@/api/invoice.api";
import { styles } from "@/styles/Collected.styles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { showMessage } from "react-native-flash-message";
import EditModal, { EditSession, FieldType } from "./uncollected/ui/EditModal";

/**
 * Component con để hiển thị 1 hàng thông tin (label-value)
 */
function InfoRow({
  label,
  value,
  color = "#334155",
  labelStyle,
  valueStyle,
  onPress,
}: {
  label: string;
  value: string;
  color?: string;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
        flexWrap: "wrap",
      }}
    >
      <Text allowFontScaling={false} style={[{ fontWeight: "600", color: "#475569", flex: 1 }, labelStyle]}>
        {label}
      </Text>
      <View style={{ flex: 1.6, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
        <Text
          allowFontScaling={false}
          style={[
            {
              color,
              fontWeight: "500",
              textAlign: "right",
              marginRight: onPress ? 4 : 0,
            },
            valueStyle,
          ]}
          ellipsizeMode="tail"
        >
          {value || "---"}
        </Text>

        {onPress && <MaterialCommunityIcons name="pencil" size={14} color="#007AFF" />}
      </View>
    </Container>
  );
}

/**
 * Component chính hiển thị Card thông tin chi tiết hóa đơn
 */
interface InvoiceDetailProps {
  invoice: InvoiceInfo;
  onRevertCollected?: (invoice: InvoiceInfo) => void;
  onRevertIsPaid?: () => void;
  onPrintInvoice: (invoice: InvoiceInfo) => void;
  onUpdateInfo?: (updatedFields: InvoiceInfo) => void;
}

export default function InvoiceDetail({
  invoice,
  onRevertCollected,
  onRevertIsPaid,
  onPrintInvoice,
  onUpdateInfo,
}: InvoiceDetailProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editSession, setEditSession] = useState<EditSession | null>(null);

  // Countdown 1h sau khi thu
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (invoice.collectionStatus !== "collected" || !invoice.collectionDate) {
      setSecondsLeft(null);
      return;
    }
    const calc = () => {
      const remaining = 3600000 - (Date.now() - new Date(invoice.collectionDate!).getTime());
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    };
    setSecondsLeft(calc());
    intervalRef.current = setInterval(() => {
      const r = calc();
      setSecondsLeft(r);
      if (r <= 0 && intervalRef.current) clearInterval(intervalRef.current);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [invoice.collectionStatus, invoice.collectionDate]);

  const assignedId =
    typeof invoice.assignedTo === "object" ? invoice.assignedTo?._id : invoice.assignedTo;

  // Khóa chỉnh sửa: hóa đơn đã thu > 1 giờ thì chỉ admin mới được sửa
  const isCollectedLocked =
    user?.role !== "admin" &&
    invoice.collectionStatus === "collected" &&
    !!invoice.collectionDate &&
    Date.now() - new Date(invoice.collectionDate).getTime() > 3600000;

  const canEditInvoice = !!user && !isCollectedLocked &&
    (user.role === "admin" || (!!assignedId && assignedId === user._id));
  const feeRaw = user?.collectionFee ?? invoice.assignedTo?.collectionFee ?? 0;
  const collectionFee = Number(feeRaw) > 0 ? Number(feeRaw) : 0;
  const totalWithFee = Number(invoice.totalAmount || 0) + collectionFee;

  const startEdit = (key: keyof InvoiceInfo, label: string, type: FieldType = "text") => {
    if (isCollectedLocked) {
      showMessage({ message: "Hóa đơn đã thu trên 1 giờ, không thể chỉnh sửa.", type: "warning" });
      return;
    }
    if (!canEditInvoice) {
      showMessage({ message: "Bạn chỉ được sửa hóa đơn thuộc về bạn.", type: "warning" });
      return;
    }

    const rawValue = invoice[key];
    const value = typeof rawValue === 'boolean' ? null : rawValue;
    setEditSession({
      key: key as string,
      label,
      value: value as string | number | null,
      type,
    });
    setModalVisible(true);
  };

  const handleSaveInfo = async (key: string, newValue: any) => {
    try {
      const updatedInvoiceData = { ...invoice, [key]: newValue };
      const assignedToId =
        typeof updatedInvoiceData.assignedTo === "object"
          ? updatedInvoiceData.assignedTo?._id
          : updatedInvoiceData.assignedTo;

      const formData: any = {
        invoiceNumber: updatedInvoiceData.invoiceNumber,
        customerName: updatedInvoiceData.customerName,
        customerAddress: updatedInvoiceData.customerAddress,
        customerPhone: updatedInvoiceData.customerPhone,
        currentAmount: updatedInvoiceData.currentAmount,
        previousAmount: updatedInvoiceData.previousAmount,
        totalAmount: updatedInvoiceData.totalAmount,
        billing_period: updatedInvoiceData.billing_period,
        recordBookCode: updatedInvoiceData.recordBookCode,
      };
      if (assignedToId) formData.assignedTo = assignedToId;

      const response = await updateInvoice(invoice._id, formData);
      const newInvoiceFromServer = response?.invoice || response?.data?.invoice || updatedInvoiceData;

      if (onUpdateInfo) {
        if (
          newInvoiceFromServer?.assignedTo &&
          typeof newInvoiceFromServer.assignedTo === "string" &&
          invoice.assignedTo &&
          typeof invoice.assignedTo === "object"
        ) {
          newInvoiceFromServer.assignedTo = invoice.assignedTo;
        }
        onUpdateInfo(newInvoiceFromServer as InvoiceInfo);
      }

      showMessage({ message: "Cập nhật thành công", type: "success" });
    } catch (error: any) {
      console.error("Update failed:", error);
      showMessage({
        message: error?.message || "Có lỗi xảy ra khi cập nhật.",
        type: "danger",
      });
    }
  };

  return (
    <>
      <View style={styles.invoiceDetailContainer}>
        <TouchableOpacity
          onPress={() => onPrintInvoice(invoice)}
          style={[styles.actionButton, styles.printButton]}
        >
          <Text style={styles.actionButtonText}>In biên nhận</Text>
        </TouchableOpacity>

        {onRevertCollected && (
          <TouchableOpacity onPress={() => onRevertCollected(invoice)} style={[styles.actionButton, styles.revertButton]}>
            <Text style={styles.actionButtonText}>Hoàn lại trạng thái</Text>
          </TouchableOpacity>
        )}

        {onRevertIsPaid && (
          <TouchableOpacity onPress={onRevertIsPaid} style={[styles.actionButton, styles.revertButton]}>
            <Text style={styles.actionButtonText}>Hoàn lại đóng cước</Text>
          </TouchableOpacity>
        )}

        <Text
          allowFontScaling={false}
          style={{
            fontSize: 18,
            fontWeight: "700",
            marginTop: 10,
            marginBottom: 12,
            color: "#1e293b",
            textAlign: "center",
          }}
        >
          Thông tin hóa đơn
        </Text>

        {/* Banner countdown khóa sửa */}
        {secondsLeft !== null && secondsLeft > 0 && (
          <View style={{ backgroundColor: "#fef3c7", borderRadius: 8, padding: 8, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: "#92400e" }}>
              🔓 Có thể sửa trong: <Text style={{ fontWeight: "700" }}>{Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, "0")}</Text>
            </Text>
          </View>
        )}
        {secondsLeft === 0 && (
          <View style={{ backgroundColor: "#fee2e2", borderRadius: 8, padding: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 13, color: "#991b1b", fontWeight: "600" }}>🔒 Đã khóa chỉnh sửa (hơn 1 giờ sau khi thu)</Text>
          </View>
        )}
        <InfoRow
          label="Mã KH"
          value={invoice.invoiceNumber}
          onPress={canEditInvoice ? () => startEdit("invoiceNumber", "Mã KH", "text") : undefined}
        />
        <InfoRow
          label="Tên"
          value={invoice.customerName}
          labelStyle={{ fontWeight: "700", color: "#1e293b" }}
          valueStyle={{ fontWeight: "700", color: "#1e293b" }}
          onPress={canEditInvoice ? () => startEdit("customerName", "Tên", "text") : undefined}
        />
        <InfoRow
          label="Số điện thoại"
          value={invoice.customerPhone}
          onPress={canEditInvoice ? () => startEdit("customerPhone", "Số điện thoại", "text") : undefined}
        />
        <InfoRow
          label="Địa chỉ"
          value={invoice.customerAddress}
          onPress={canEditInvoice ? () => startEdit("customerAddress", "Địa chỉ", "text") : undefined}
        />
        <InfoRow
          label="Kỳ"
          value={invoice.billing_period}
          onPress={canEditInvoice ? () => startEdit("billing_period", "Kỳ", "text") : undefined}
        />
        {invoice.currentAmount !== null && invoice.currentAmount !== undefined && (
          <InfoRow
            label="Kỳ này"
            value={Number(invoice.currentAmount).toLocaleString("vi-VN") + " VND"}
            onPress={canEditInvoice ? () => startEdit("currentAmount", "Kỳ này", "number") : undefined}
          />
        )}
        {invoice.previousAmount !== null && invoice.previousAmount !== undefined && (
          <InfoRow
            label="Kỳ trước"
            value={Number(invoice.previousAmount).toLocaleString("vi-VN") + " VND"}
            onPress={canEditInvoice ? () => startEdit("previousAmount", "Kỳ trước", "number") : undefined}
          />
        )}
        
        {/* Hiển thị phí dịch vụ và tổng cộng nếu collectionFee > 0 */}
        {collectionFee > 0 && (
          <>
            <InfoRow
              label="Phí dịch vụ"
              value={collectionFee.toLocaleString("vi-VN") + " VND"}
              labelStyle={{ color: "#f97316" }}
              valueStyle={{ color: "#f97316", fontWeight: "700" }}
            />
            <InfoRow
              label="Tổng cộng"
              value={totalWithFee.toLocaleString("vi-VN") + " VND"}
              labelStyle={{ fontWeight: "700", color: "#1e293b" }}
              valueStyle={{ fontWeight: "700", color: "#16a34a" }}
            />
          </>
        )}
        
        <InfoRow
          label="Tổng tiền"
          value={Number(invoice?.totalAmount).toLocaleString("vi-VN")}
          labelStyle={{ fontWeight: "700", color: "#1e293b" }}
          valueStyle={{ fontWeight: "700", color: "#1e293b" }}
          onPress={canEditInvoice ? () => startEdit("totalAmount", "Tổng tiền", "number") : undefined}
        />
        <InfoRow
          label="Trạng thái thu"
          value={invoice.collectionStatus === "collected" ? "Đã thu" : "Chưa thu"}
          color={invoice.collectionStatus === "collected" ? "#16a34a" : "#000000"}
        />
        <InfoRow
          label="Trạng thái đóng cước"
          value={invoice.isPaid ? "Đã đóng cước" : "Chưa đóng cước"}
          color={invoice.isPaid ? "#9ca3af" : "#000000"}
        />
        <InfoRow
          label="Trạng thái in"
          value={invoice.printStatus === "printed" ? "Đã in" : "Chưa in"}
          color={invoice.printStatus === "printed" ? "#16a34a" : "#dc2626"}
        />
        <InfoRow
          label="Trạm"
          value={invoice.recordBookCode as string}
          onPress={canEditInvoice ? () => startEdit("recordBookCode", "Trạm", "text") : undefined}
        />
        <InfoRow
          label="Ngày thu"
value={invoice.collectionDate ? new Intl.DateTimeFormat('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}).format(new Date(invoice.collectionDate)) : "---"}
        />
        <InfoRow label="Người phụ trách" value={invoice.assignedTo?.fullName || "---"} />
      </View>

      <EditModal
        visible={modalVisible}
        session={editSession}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveInfo}
      />
    </>
  );
}


