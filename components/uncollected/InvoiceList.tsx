import { Text } from "@/components/StyledText";
import { InvoiceInfo } from "@/types/invoice";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, LayoutAnimation, TouchableOpacity, View } from "react-native";
import InvoiceDetail from "./InvoiceDetail";

// Hook đếm ngược thời gian còn lại đến 1h sau khi collected
function useCollectedCountdown(invoice: InvoiceInfo) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (invoice.collectionStatus !== "collected" || !invoice.collectionDate) {
      setSecondsLeft(null);
      return;
    }
    const calcRemaining = () => {
      const elapsed = Date.now() - new Date(invoice.collectionDate!).getTime();
      const remaining = 3600000 - elapsed; // 1h = 3600000ms
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    };
    setSecondsLeft(calcRemaining());
    intervalRef.current = setInterval(() => {
      const r = calcRemaining();
      setSecondsLeft(r);
      if (r <= 0 && intervalRef.current) clearInterval(intervalRef.current);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [invoice.collectionStatus, invoice.collectionDate]);

  return secondsLeft;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
  return invoiceNumber.replace(/0900/, "...");
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

    const secondsLeft = useCollectedCountdown(item);
    // isLocking = đã collected nhưng chưa hết 1h (đang trong giai đoạn có thể sửa nhưng mờ)
    const isLocking = secondsLeft !== null && secondsLeft > 0;
    // isLocked = đã hết 1h -> khóa hẳn
    const isLocked = secondsLeft === 0;

    return (
      <View style={{ marginBottom: 8, opacity: isLocking ? 0.65 : 1 }}>
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
          {/* Layout: 70% Trái = Thông tin, 30% Phải = Buttons */}
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* Bên Trái (70%) */}
            <View style={{ flex: 3.3, marginRight: 8 }}>
              <Text
                style={{
                  fontWeight: item.collectionStatus === "collected" || item.isPaid ? "600" : "700",
                  color: item.collectionStatus === "collected" ? "#16a34a" : (item.isPaid ? "#6b7280" : "#000000"),
                }}
              >
                {displayInvoiceNumber} - {Number(item.totalAmount).toLocaleString("vi-VN")}
              </Text>
              {/* Countdown timer nhỏ khi đang trong giai đoạn 1h */}
              {isLocking && (
                <Text style={{ fontSize: 10, color: "#f59e0b", fontWeight: "600" }}>
                  🔓 Khóa sau: {formatCountdown(secondsLeft!)}
                </Text>
              )}
              {isLocked && (
                <Text style={{ fontSize: 10, color: "#ef4444", fontWeight: "600" }}>
                  🔒 Đã khóa sửa
                </Text>
              )}
              <Text style={{ color: "#475569" }} numberOfLines={1} ellipsizeMode="tail">
                Trạm: {item.recordBookCode || 'N/A'} - {item.customerName}
              </Text>
              {/* {item.isPaid && (
                <Text style={{ color: "#6b7280", fontWeight: "600", fontSize: 12, marginTop: 2 }}>
                  ✓ Đã đóng cước
                </Text>
              )} */}
              {/* Text Chi tiết bên dưới */}
              <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "left" }}>
                {isExpanded ? "▲ Thu gọn" : "▼ Chi tiết"}
              </Text>
            </View>

            {/* Bên Phải (30%): Buttons 2 dòng */}
            <View style={{ flex: 1 }}>
              {/* Dòng 1: In thông báo & In biên nhận */}
              <View style={{ flexDirection: "row", gap: 2, marginBottom: 4 }}>
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
              </View>

              {/* Dòng 2: Đã thu & Đóng cước */}
              <View style={{ flexDirection: "row", gap: 2 }}>
                <TouchableOpacity
                  onPress={handleMarkCollected}
                  disabled={item.collectionStatus === "collected"}
                  style={{
                    flex: 1,
                    backgroundColor: item.collectionStatus === "collected" ? "#9ca3af" : "#16a34a",
                    paddingVertical: 6,
                    borderRadius: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 26,
                    opacity: item.collectionStatus === "collected" ? 0.6 : 1,
                  }}
                >
                  <Ionicons 
                    name={item.collectionStatus === "collected" ? "checkmark-done-circle" : "checkmark"} 
                    size={14} 
                    color="#fff" 
                  />
                </TouchableOpacity>


                <TouchableOpacity
                  onPress={handleIsPaid}
                  style={{
                    flex: 1,
                    backgroundColor: item.isPaid ? "#6b7280" : "#7c3aed",
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

