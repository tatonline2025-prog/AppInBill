import { Text } from "@/components/StyledText";
import { InvoiceInfo } from "@/types/invoice";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useCallback, useState } from "react";
import { ActivityIndicator, LayoutAnimation, TouchableOpacity, View } from "react-native";
import InvoiceDetail from "./InvoiceDetail";

type InvoiceListProps = {
  title: string;
  invoices: InvoiceInfo[];
  onSelectInvoice: (invoice: InvoiceInfo | null) => void;
  actions: {
    onMarkCollected: (invoice: InvoiceInfo) => void;
    onPrint: (invoice: InvoiceInfo) => void;
    onPrintInvoice: (invoice: InvoiceInfo) => void;
    onIsPaid: (invoice: InvoiceInfo) => void;
  };
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  totalInvoices?: number;
  totalAmount?: number;
  onUpdateInfo?: (updatedInvoice: InvoiceInfo) => void;
};

// Hàm rút gọn mã khách hàng: PB0709001234 -> PB071234 (bỏ phần 0900)
const shortenInvoiceNumber = (invoiceNumber: string) => {
  if (!invoiceNumber) return "";
  // Tìm và thay thế phần "0900" ở giữa
  // Ví dụ: PB0709001234 -> PB071234
  return invoiceNumber.replace(/0900/, "");
};

// --- 1. TÁCH COMPONENT CON & SỬ DỤNG MEMO ---
const InvoiceItem = memo(
  function InvoiceItem({
    item,
    isExpanded,
    onToggle,
    actions,
    onUpdateInfo,
  }: {
    item: InvoiceInfo;
    isExpanded: boolean;
    onToggle: (item: InvoiceInfo) => void;
    actions: any;
    onUpdateInfo?: (updatedInvoice: InvoiceInfo) => void;
  }) {
    const handlePrintNotice = (e: any) => {
      e.stopPropagation();
      actions.onPrint(item);
    };

    const handlePrintInvoice = (e: any) => {
      e.stopPropagation();
      actions.onPrintInvoice(item);
    };

    const handleMarkCollected = (e: any) => {
      e.stopPropagation();
      actions.onMarkCollected(item);
    };

    const handleIsPaid = (e: any) => {
      e.stopPropagation();
      actions.onIsPaid(item);
    };

    // Rút gọn mã khách hàng khi không mở rộng
    const displayInvoiceNumber = isExpanded ? item.invoiceNumber : shortenInvoiceNumber(item.invoiceNumber);

    return (
      <View style={{ marginBottom: 8 }}>
        <TouchableOpacity
          style={{
            backgroundColor: isExpanded ? "#eff6ff" : "#fff",
            padding: 12,
            borderRadius: 8,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: isExpanded ? "#2563eb" : "#e2e8f0",
          }}
          activeOpacity={0.7}
          onPress={() => onToggle(item)}
        >
          {/* Layout: 60% Trái = Thông tin, 40% Phải = Buttons */}
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* Bên Trái (60%): Thông tin - Giảm diện tích */}
            <View style={{ flex: 2.5, marginRight: 8 }}>
              <Text style={{ fontWeight: "600", color: "#2563eb" }}>
                {displayInvoiceNumber} - {Number(item.totalAmount).toLocaleString("vi-VN")}
              </Text>
              <Text style={{ color: "#475569" }} numberOfLines={1} ellipsizeMode="tail">
                {item.customerName}
              </Text>
              {item.isPaid && (
                <Text style={{ color: "#16a34a", fontWeight: "600", fontSize: 12, marginTop: 2 }}>
                  ✓ Đã đóng cước
                </Text>
              )}
            </View>

            {/* Bên Phải (40%): Buttons + Chi tiết */}
            <View style={{ flex: 1.5 }}>
              {/* 4 Button icons trên 1 hàng ngang - Giảm gap/padding */}
              <View style={{ flexDirection: "row", gap: 2, marginBottom: 6 }}>
                {/* Button In thông báo nhanh (mới) - cam */}
                <TouchableOpacity
                  onPress={handlePrintNotice}
                  style={{
                    flex: 1,
                    backgroundColor: "#f97316",
                    paddingVertical: 6,
                    borderRadius: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 26,
                  }}
                >
                  <Ionicons name="document-text-outline" size={14} color="#fff" />
                </TouchableOpacity>

                {/* Button In biên nhận - máy in */}
                <TouchableOpacity
                  onPress={handlePrintInvoice}
                  style={{
                    flex: 1,
                    backgroundColor: "#2563eb",
                    paddingVertical: 6,
                    borderRadius: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 26,
                  }}
                >
                  <Ionicons name="print" size={14} color="#fff" />
                </TouchableOpacity>

                {/* Button Đã thu - V (conditional) */}
                {item.collectionStatus !== "collected" && item.totalAmount && item.totalAmount !== 0 && (
                  <TouchableOpacity
                    onPress={handleMarkCollected}
                    style={{
                      flex: 1,
                      backgroundColor: "#16a34a",
                      paddingVertical: 6,
                      borderRadius: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 26,
                    }}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </TouchableOpacity>
                )}

                {/* Button Đóng cước/X - tùy trạng thái */}
                <TouchableOpacity
                  onPress={handleIsPaid}
                  style={{
                    flex: 1,
                    backgroundColor: item.isPaid ? "#f59e0b" : "#7c3aed",
                    paddingVertical: 6,
                    borderRadius: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 26,
                  }}
                >
                  <Ionicons name={item.isPaid ? "close" : "close-circle"} size={14} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Text Chi tiết bên dưới */}
              <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                {isExpanded ? "▲ Thu gọn" : "▼ Chi tiết"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View
            style={{
              marginTop: -4,
              paddingTop: 10,
              backgroundColor: "#f1f5f9",
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              padding: 8,
              borderWidth: 1,
              borderTopWidth: 0,
              borderColor: "#e2e8f0",
            }}
          >
            <InvoiceDetail
              invoice={item}
              onMarkCollected={() => actions.onMarkCollected(item)}
              onPrint={() => actions.onPrint(item)}
              onPrintInvoice={() => actions.onPrintInvoice(item)}
              onIsPaid={() => actions.onIsPaid(item)}
              onUpdateInfo={onUpdateInfo}
            />
          </View>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.isExpanded !== nextProps.isExpanded) return false;
    if (prevProps.item !== nextProps.item) return false;
    if (nextProps.isExpanded) {
      return prevProps.actions === nextProps.actions;
    }
    return true;
  }
);

export default function InvoiceList({
  title,
  invoices,
  onSelectInvoice,
  actions,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  totalInvoices,
  totalAmount,
  onUpdateInfo,
}: InvoiceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const Amount =
    totalAmount || invoices.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0).toLocaleString("vi-VN");

  const handleToggleItem = useCallback(
    (item: InvoiceInfo) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setExpandedId((prevId) => {
        const isCurrentlyExpanded = prevId === item._id;
        const newId = isCurrentlyExpanded ? null : item._id;

        requestAnimationFrame(() => {
          if (isCurrentlyExpanded) {
            onSelectInvoice(null);
          } else {
            onSelectInvoice(item);
          }
        });

        return newId;
      });
    },
    [onSelectInvoice]
  );

  return (
    <View style={{ width: "100%", marginTop: 10 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6 }}>{title}</Text>

      <View
        style={{
          backgroundColor: "#fff",
          padding: 12,
          borderRadius: 8,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: "#e2e8f0",
        }}
      >
        {totalInvoices && (
          <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6, color: "#000" }}>
            Tổng hoá đơn: <Text style={{ color: "#2563eb" }}>{totalInvoices}</Text>
          </Text>
        )}
        <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6, color: "#000" }}>
          Tổng tiền: <Text style={{ color: "#0d9488" }}>{totalAmount?.toLocaleString("vi-VN") ?? Amount} VND</Text>
        </Text>

        <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6, color: "#000" }}>
          Đang hiển thị: <Text style={{ color: "#2563eb" }}>{invoices.length}</Text>
        </Text>
      </View>

      <View>
        {invoices.map((item) => (
          <InvoiceItem
            key={item._id}
            item={item}
            isExpanded={expandedId === item._id}
            onToggle={handleToggleItem}
            actions={actions}
            onUpdateInfo={onUpdateInfo}
          />
        ))}
      </View>

      {hasMore && onLoadMore && (
        <TouchableOpacity
          onPress={onLoadMore}
          disabled={isLoading}
          style={{
            padding: 12,
            marginTop: 4,
            marginBottom: 20,
            backgroundColor: "#f8fafc",
            borderRadius: 8,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#cbd5e1",
            borderStyle: "dashed",
          }}
        >
          {isLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator size="small" color="#0d9488" />
              <Text style={{ marginLeft: 8, color: "#64748b", fontSize: 14 }}>Đang tải thêm...</Text>
            </View>
          ) : (
            <Text style={{ color: "#0f766e", fontWeight: "600", fontSize: 14 }}>▼ Xem thêm</Text>
          )}
        </TouchableOpacity>
      )}

      {!hasMore && invoices.length > 0 && (
        <Text style={{ textAlign: "center", color: "#94a3b8", marginBottom: 20, fontStyle: "italic" }}>
          — Đã hiển thị hết danh sách —
        </Text>
      )}
    </View>
  );
}
