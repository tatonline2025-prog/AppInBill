// --- File: components/uncollected/InvoiceDetail.tsx ---

import { updateInvoice } from "@/api/invoice.api";
import { Text } from "@/components/StyledText";
import { InvoiceInfo } from "@/types/invoice";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { showMessage } from "react-native-flash-message";
import EditModal, { EditSession, FieldType } from "./ui/EditModal";
import InfoRow from "./ui/InfoRow";

type InvoiceDetailProps = {
  invoice: InvoiceInfo;
  onMarkCollected: () => void;
  onPrint: () => void;
  onPrintInvoice: () => void;
  onIsPaid: () => void;
  onUpdateInfo?: (updatedFields: InvoiceInfo) => void;
};

export default function InvoiceDetail({
  invoice,
  onMarkCollected,
  onPrint,
  onPrintInvoice,
  onIsPaid,
  onUpdateInfo,
}: InvoiceDetailProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editSession, setEditSession] = useState<EditSession | null>(null);

  const startEdit = (key: keyof InvoiceInfo, label: string, type: FieldType = "text") => {
    const rawValue = invoice[key];
    let value: string | number | null = null;
    if (typeof rawValue === 'string' || typeof rawValue === 'number') {
      value = rawValue;
    }
    setEditSession({
      key: key as string,
      label,
      value,
      type,
    });
    setModalVisible(true);
  };

  const handleSaveInfo = async (key: string, newValue: any) => {
    try {
      // 1. Tạo bản sao của hoá đơn hiện tại để chỉnh sửa
      // Lấy dữ liệu từ props 'invoice' đang có
      const updatedInvoiceData = { ...invoice, [key]: newValue };

      // Backend yêu cầu phải có đủ các trường bắt buộc, nếu thiếu sẽ lỗi 400
      const formData = {
        customerName: updatedInvoiceData.customerName,
        customerAddress: updatedInvoiceData.customerAddress,
        customerPhone: updatedInvoiceData.customerPhone,

        // Các trường số quan trọng
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
        const newInvoiceFromServer = response.invoice;

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
      <View
        style={{
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 20,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 4,
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Nút In thông báo */}
          <TouchableOpacity
            onPress={onPrint}
            style={{
              flex: 1, // Chiếm 50% chiều rộng
              backgroundColor: "#f97316", // Màu cam
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>In thông báo</Text>
          </TouchableOpacity>

          {/* Nút In biên nhận */}
          <TouchableOpacity
            onPress={onPrintInvoice}
            style={{
              flex: 1, // Chiếm 50% chiều rộng
              backgroundColor: "#2563eb", // Màu xanh dương
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>In biên nhận</Text>
          </TouchableOpacity>
        </View>

        {/* --- KHU VỰC NÚT TRẠNG THÁI THU CƯỚC --- */}
        <View style={{ flexDirection: "row", marginTop: 10, gap: 10 }}>
          {invoice.collectionStatus !== "collected" &&
            invoice.totalAmount &&
            invoice.totalAmount !== 0 &&
            invoice.totalAmount.toString().toLowerCase() !== "không nợ cước" && (
              <TouchableOpacity
                onPress={onMarkCollected}
                style={{
                  flex: 1,
                  backgroundColor: "#16a34a", // Màu xanh lá
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Xác nhận đã thu</Text>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            onPress={onIsPaid}
            style={{
              flex: 1,
              backgroundColor: "#7c3aed",
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            {invoice.isPaid ? (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Hoàn lại đóng cước</Text>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Đã đóng cước</Text>
            )}
          </TouchableOpacity>
        </View>

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
          labelStyle={{ fontWeight: "700", fontSize: 15, color: "#334155" }}
          valueStyle={{ fontWeight: "700", fontSize: 15, color: "#334155" }}
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
              labelStyle={{ fontWeight: "700", fontSize: 15, color: "#334155" }}
              valueStyle={{ fontWeight: "700", fontSize: 15, color: "#16a34a" }}
            />
          </>
        )}
        
        <InfoRow
          label="Tổng tiền"
          value={Number(invoice.totalAmount).toLocaleString("vi-VN") + " VND"}
          labelStyle={{ fontWeight: "700", fontSize: 15, color: "#334155" }}
          valueStyle={{ fontWeight: "700", fontSize: 15, color: "#334155" }}
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
        {/* <InfoRow label="Ngày giao" value={new Date(invoice.issueDate).toLocaleDateString("vi-VN")} /> */}
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

