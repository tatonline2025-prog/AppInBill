import { Text } from "@/components/StyledText";
import { InvoiceInfo } from "@/types/invoice";
import React, { useState } from "react";
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
 * Component chính hiển thị Card thông tin chi tiết hoá đơn
 */
interface InvoiceDetailProps {
  invoice: InvoiceInfo;
  onRevertCollected?: () => void;
  onRevertIsPaid?: () => void;
  onPrintInvoice: () => void;
  onUpdateInfo?: (updatedFields: InvoiceInfo) => void;
}

export default function InvoiceDetail({
  invoice,
  onRevertCollected,
  onRevertIsPaid,
  onPrintInvoice,
  onUpdateInfo,
}: InvoiceDetailProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editSession, setEditSession] = useState<EditSession | null>(null);

  const startEdit = (key: keyof InvoiceInfo, label: string, type: FieldType = "text") => {
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

  const handleSaveInfo = async (key: string, newValue: string | number | null | undefined) => {
    try {
      const updatedInvoiceData = { ...invoice, [key]: newValue };

      const formData = {
        customerName: updatedInvoiceData.customerName,
        customerAddress: updatedInvoiceData.customerAddress,
        customerPhone: updatedInvoiceData.customerPhone,
        currentAmount: updatedInvoiceData.currentAmount,
        previousAmount: updatedInvoiceData.previousAmount,
        totalAmount: updatedInvoiceData.totalAmount,
        billing_period: updatedInvoiceData.billing_period,
        recordBookCode: updatedInvoiceData.recordBookCode,
        assignedTo:
          typeof updatedInvoiceData.assignedTo === "object"
            ? updatedInvoiceData.assignedTo?._id
            : updatedInvoiceData.assignedTo,
      };

      const response = await updateInvoice(formData, invoice.invoiceNumber);

      if (response && response.invoice) {
        const newInvoiceFromServer = response.data.invoice;

        if (onUpdateInfo) {
          if (newInvoiceFromServer) {
            if (
              newInvoiceFromServer.assignedTo &&
              typeof newInvoiceFromServer.assignedTo === "string" &&
              invoice.assignedTo &&
              typeof invoice.assignedTo === "object"
            ) {
              newInvoiceFromServer.assignedTo = invoice.assignedTo;
            }

            onUpdateInfo(newInvoiceFromServer);
          } else {
            onUpdateInfo(updatedInvoiceData as InvoiceInfo);
          }
        }
        showMessage({ message: "Cập nhật thành công", type: "success" });
      } else {
        showMessage({ message: `Lỗi + ${response.data.message}`, type: "warning" });
      }
    } catch (error) {
      console.error("Lỗi gọi API:", error);
      alert("Có lỗi xảy ra khi cập nhật.");
    }
  };

  return (
    <>
      <View style={styles.invoiceDetailContainer}>
        <TouchableOpacity
          onPress={onPrintInvoice}
          style={[styles.actionButton, styles.printButton]}
        >
          <Text style={styles.actionButtonText}>In biên nhận</Text>
        </TouchableOpacity>

        {onRevertCollected && (
          <TouchableOpacity onPress={onRevertCollected} style={[styles.actionButton, styles.revertButton]}>
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
          Thông tin hoá đơn
        </Text>

        <InfoRow label="Mã KH" value={invoice.invoiceNumber} />
        <InfoRow
          label="Tên"
          value={invoice.customerName}
          labelStyle={{ fontWeight: "700", color: "#1e293b" }}
          valueStyle={{ fontWeight: "700", color: "#1e293b" }}
          onPress={() => startEdit("customerName", "Tên", "text")}
        />
        <InfoRow label="Số điện thoại" value={invoice.customerPhone} />
        <InfoRow
          label="Địa chỉ"
          value={invoice.customerAddress}
          onPress={() => startEdit("customerAddress", "Địa chỉ", "text")}
        />
        <InfoRow label="Kỳ" value={invoice.billing_period} />
        
        {/* Hiển thị phí dịch vụ và tổng cộng nếu collectionFee > 0 */}
        {invoice.assignedTo?.collectionFee > 0 && (
          <>
            <InfoRow
              label="Phí dịch vụ"
              value={Number(invoice.assignedTo?.collectionFee || 0).toLocaleString("vi-VN") + " VND"}
              labelStyle={{ color: "#f97316" }}
              valueStyle={{ color: "#f97316", fontWeight: "700" }}
            />
            <InfoRow
              label="Tổng cộng"
              value={Number(invoice.totalAmount + (invoice.assignedTo?.collectionFee || 0)).toLocaleString("vi-VN") + " VND"}
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
        />
        <InfoRow
          label="Trạng thái thu"
          value={invoice.collectionStatus === "collected" ? "Đã thu" : "Chưa thu"}
          color={invoice.collectionStatus === "collected" ? "#16a34a" : "#dc2626"}
        />
        <InfoRow
          label="Trạng thái đóng cước"
          value={invoice.isPaid ? "Đã đóng cước" : "Chưa đóng cước"}
          color={invoice.isPaid ? "#16a34a" : "#dc2626"}
        />
        <InfoRow
          label="Trạng thái in"
          value={invoice.printStatus === "printed" ? "Đã in" : "Chưa in"}
          color={invoice.printStatus === "printed" ? "#16a34a" : "#dc2626"}
        />
        <InfoRow
          label="Trạm"
          value={invoice.recordBookCode as string}
          onPress={() => startEdit("recordBookCode", "Trạm", "text")}
        />
        <InfoRow
          label="Ngày thu"
          value={invoice.collectionDate ? new Date(invoice.collectionDate).toLocaleDateString("vi-VN") : "---"}
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
