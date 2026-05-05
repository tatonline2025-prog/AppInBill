// --- File: app/(tabs)/Collected.tsx ---
import { Text, TextInput } from "@/components/StyledText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ViewShot from "react-native-view-shot";

import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { showMessage } from "react-native-flash-message";

// Hooks & API
import { handleToggle_API, updateInvoice } from "@/api/invoice.api";
import { getInvoiceLayout } from "@/api/invoicelayout.api";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useAuth } from "@/context/AuthContext";
import { useInvoicePrinter } from "@/hooks/useInvoicePrinter";
import { shortenCustomerCode } from "@/utils/shortenCustomerCode";

// Components
import InvoiceDetail from "@/components/InvoiceDetail";
import { DynamicInvoiceLayout } from "@/components/InvoiceLayout";
import PrinterModal from "@/components/PrinterModal";
import { useCollectedManager } from "@/hooks/collected/useCollectedManager";
import { styles } from "@/styles/Collected.styles";
import { InvoiceInfo } from "@/types/invoice";
import { DEFAULT_INVOICE_LAYOUT, InvoiceLayoutItem } from "@/types/invoice-layout";
function useCollectedCountdown(collectionDate?: string | null) {
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  React.useEffect(() => {
    if (!collectionDate) { setSecondsLeft(null); return; }
    const calc = () => {
      const remaining = 3600000 - (Date.now() - new Date(collectionDate).getTime());
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    };
    setSecondsLeft(calc());
    timerRef.current = setInterval(() => {
      const r = calc();
      setSecondsLeft(r);
      if (r <= 0 && timerRef.current) clearInterval(timerRef.current);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [collectionDate]);
  return secondsLeft;
}
function fmtCountdown(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// --- COMPONENT CON: ITEM HÓA ĐƠN ---
const InvoiceItem = React.memo(
  function InvoiceItem({ item, isExpanded, onToggle, onRevert, onPrint, onUpdateInfo }: any) {
    const invoiceNumberColor = item.collectionStatus === "collected" ? "#16a34a" : (item.isPaid ? "#6b7280" : "#000000");
    const invoiceNumberWeight = item.collectionStatus === "collected" || item.isPaid ? "600" : "700";
    const secondsLeft = useCollectedCountdown(item.collectionDate);
    const isLocking = secondsLeft !== null && secondsLeft > 0;

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
          onPress={() => onToggle(item)}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: invoiceNumberWeight, color: invoiceNumberColor }}>
                {shortenCustomerCode(item.invoiceNumber || item.customerPhone || '')} - {item.customerName}
              </Text>
              <Text style={{ color: "#475569" }}>Tiền: {Number(item.totalAmount).toLocaleString("vi-VN")} đ</Text>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {item.collectionDate
                    ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.collectionDate))
                    : "Chưa thu"}
                </Text>
                {isLocking && (
                  <Text style={{ fontSize: 10, color: "#f59e0b", fontWeight: "700" }}>
                    🔓 {fmtCountdown(secondsLeft!)}
                  </Text>
                )}
                {secondsLeft === 0 && (
                  <Text style={{ fontSize: 10, color: "#ef4444", fontWeight: "700" }}>🔒 Khóa sửa</Text>
                )}
              </View>
            </View>
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>{isExpanded ? "▲ Thu gọn" : "▼ Chi tiết"}</Text>
          </View>
        </TouchableOpacity>

        {/* Chỉ render InvoiceDetail khi được mở */}
        {isExpanded && (
          <View
            style={{
              marginTop: -4,
              paddingTop: 10,
              backgroundColor: "#f8fafc",
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
              onRevertCollected={onRevert}
              onPrintInvoice={onPrint}
              onUpdateInfo={onUpdateInfo}
            />
          </View>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Logic tối ưu render:
    // 1. Nếu trạng thái mở/đóng thay đổi -> Render lại
    if (prevProps.isExpanded !== nextProps.isExpanded) return false;

    // 2. Nếu dữ liệu item thay đổi -> Render lại
    if (prevProps.item !== nextProps.item) return false;

    // 3. Nếu các props khác vẫn giữ nguyên -> Không render
    return true;
  }
);

// --- COMPONENT CHÍNH ---
export default function Collected() {
  // --- Hooks ---
  const { user, loading: authLoading } = useAuth();
  const {
    searchText,
    searchType,
    selectedDate,
    invoiceData,
    suggestions,
    selectedInvoice,
    setSelectedInvoice,
    setInvoiceData,
    isLoading,
    searchByText,
    searchByDate,
    handleSelectSuggestion,
    resetAll,
    handleTextChange,
    handleTypeChange,
    currentPage,
    totalPages,
    isLoadingMore,
    totalInvoices,
    totalAmount,
  } = useCollectedManager(user);

  const [invoiceLayout, setInvoiceLayout] = useState<InvoiceLayoutItem[] | null>(null);
  const [isLayoutLoading, setIsLayoutLoading] = useState(true);

  const viewShotRef = useRef<ViewShot>(null);
  const { handlePrintInvoice, printerModalProps, isLayoutVisible, isPrinting, paperWidthPx, cancelPrint } = useInvoicePrinter(
    viewShotRef,
    selectedInvoice
  );

  // --- Local State ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    fetchLayout();
  }, [user]);

  // --- Auto-refresh when screen gains focus ---
  // This ensures user sees the latest status changes made by admin
  // Using useFocusEffect with proper cleanup to avoid infinite loops
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup function - do nothing on blur
      };
    }, [])
  );
  
  // Load initial data when user logs in (only once)
  useEffect(() => {
    if (user && searchText) {
      searchByText();
    }
  }, [user]);

  const fetchLayout = async () => {
    try {
      setIsLayoutLoading(true);
      const res = await getInvoiceLayout();
      const selectedForm = res?.find((form: any) => form.templateType === "Biên nhận thanh toán");
      setInvoiceLayout(selectedForm?.layout || DEFAULT_INVOICE_LAYOUT);
    } catch {
      setInvoiceLayout(DEFAULT_INVOICE_LAYOUT);
    } finally {
      setIsLayoutLoading(false);
    }
  };

  const handleUpdateInfo = useCallback(
    (updatedInvoice: InvoiceInfo) => {
      if (setInvoiceData) {
        setInvoiceData((prevList) => prevList.map((item) => (item._id === updatedInvoice._id ? updatedInvoice : item)));
      }

      setSelectedInvoice((prev) => (prev && prev._id === updatedInvoice._id ? updatedInvoice : prev));

      showMessage({ message: "Thông tin đã được cập nhật", type: "success" });
    },
    [setInvoiceData, setSelectedInvoice] // Thêm dependencies để hàm hoạt động đúng
  );

  // --- Actions ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLayout();
    resetAll();
    setRefreshing(false);
    showMessage({ message: "Đã làm mới dữ liệu", type: "success" });
  }, [resetAll]);

  const handleRevertCollected = async (item?: InvoiceInfo) => {
    const targetInvoice = item || selectedInvoice;
    if (!targetInvoice) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      await handleToggle_API(targetInvoice._id, "collectionStatus");
      // Cố gắng xóa assignedTo — bỏ qua nếu backend không hỗ trợ null
      try {
        await updateInvoice(targetInvoice._id, { assignedTo: null });
      } catch {}
      showMessage({ message: "Đã hoàn lại trạng thái.", type: "success" });

      setSelectedInvoice(null);

      if (selectedDate) {
        searchByDate(selectedDate);
      } else {
        searchByText();
      }
    } catch {
      showMessage({ message: "Lỗi khi hoàn trạng thái", type: "danger" });
    }
  };

  const handlePrintWithLatestLayout = async (item?: InvoiceInfo) => {
    const targetInvoice = item || selectedInvoice;
    if (!targetInvoice) {
      Alert.alert("Chưa có hóa đơn", "Vui lòng chọn hóa đơn trước khi in.");
      return;
    }
    
    try {
      // Do not block printing when layout API is slow/unavailable.
      fetchLayout().catch((err) => console.warn("Refetch collected layout failed:", err));
      // Đợi layout hiện tại render xong
      await new Promise(resolve => setTimeout(resolve, 120));
      // Gọi hàm in với hóa đơn cụ thể
      await handlePrintInvoice(targetInvoice);
    } catch (error) {
      console.error("Lỗi in:", error);
      Alert.alert("Lỗi", "Không thể in hóa đơn.");
    }
  };

  const handleToggleInvoice = useCallback((item: InvoiceInfo) => {
    setSelectedInvoice((prev: InvoiceInfo | null) => {
      if (prev && prev._id === item._id) return null; // Đóng nếu đang mở đúng item đó
      return item; // Mở item mới
    });
  }, [setSelectedInvoice]);

  // --- 1. RENDER HEADER (Tìm kiếm + Thống kê) ---
  const renderHeader = () => {
    return (
      <View style={{ width: "100%", marginBottom: 10 }}>
        {/* Chọn ngày */}
        <View style={{ flexDirection: "row", gap: 5, marginBottom: 10 }}>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.datePickerText}>
              {selectedDate ? `Ngày: ${selectedDate.toLocaleDateString("vi-VN")}` : "Chọn ngày thu"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.datePickerButton} onPress={() => searchByDate(new Date())}>
            <Text style={styles.datePickerText}>Đã thu hôm nay</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) searchByDate(date);
            }}
          />
        )}

        {/* Tabs chọn loại */}
        <View
          style={{ flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 10, marginBottom: 10, padding: 4 }}
        >
          {[
            { label: "Mã KH", value: "customer" },
            { label: "Mã Trạm", value: "station" },
          ].map((option) => {
            const isActive = searchType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleTypeChange(option.value as any)}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? "#2563eb" : "transparent",
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: isActive ? "#2563eb" : "transparent",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Text style={{ color: isActive ? "#fff" : "#334155", fontSize: 15, fontWeight: "600" }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Input tìm kiếm */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <TextInput
            style={styles.textInput}
            placeholder={searchType === "customer" ? "Nhập mã khách hàng..." : "Nhập mã trạm..."}
            value={searchText}
            onChangeText={handleTextChange}
          />
          <TouchableOpacity onPress={() => searchByText()} style={styles.searchButton}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>Tìm kiếm</Text>}
          </TouchableOpacity>
        </View>

        {/* Gợi ý Dropdown (Nằm trong Header của FlatList vẫn scroll được bình thường) */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionContainer}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() =>
                    handleSelectSuggestion(searchType === "station" ? item.recordBookCode! : item.invoiceNumber)
                  }
                  style={styles.suggestionItem}
                >
                  {searchType === "station" ? (
                    <Text style={{ fontWeight: "700", color: "#6366f1" }}>{item.recordBookCode}</Text>
                  ) : (
                    <View>
                      <Text style={{ fontWeight: "700", color: "#6366f1" }}>Trạm: {item.recordBookCode}</Text>
                      <Text
                        style={{
                          fontWeight: item.collectionStatus === "collected" || item.isPaid ? "600" : "700",
                          color: item.collectionStatus === "collected" ? "#16a34a" : (item.isPaid ? "#6b7280" : "#000000"),
                        }}
                      >
                        {item.invoiceNumber}
                      </Text>
                      <Text style={{ fontSize: 12 }}>{item.customerName}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tiêu đề & Thống kê kết quả */}
        {invoiceData.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6 }}>
              {selectedDate
                ? `Danh sách đã thu ngày ${selectedDate.toLocaleDateString("vi-VN")}`
                : searchType === "station"
                ? `Danh sách trạm ${searchText.toUpperCase()}`
                : "Kết quả tìm kiếm"}
            </Text>

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
              <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6, color: "#000" }}>
                Tổng hoá đơn: <Text style={{ color: "#2563eb" }}>{totalInvoices}</Text>
              </Text>
              <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6, color: "#000" }}>
                Tổng tiền: <Text style={{ color: "#0d9488" }}>{totalAmount.toLocaleString("vi-VN")} VND</Text>
              </Text>
              <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6, color: "#000" }}>
                Đang hiển thị: <Text style={{ color: "#0d9488" }}>{invoiceData.length}</Text>
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // --- 2. RENDER FOOTER ---
  const renderFooter = () => <View style={{ height: 20 }} />;

  return (
    <View style={styles.container}>
      {/* --- SỬ DỤNG FLATLIST ĐỂ TỐI ƯU HIỆU NĂNG --- */}
      <FlatList
        data={invoiceData}
        keyExtractor={(item) => item._id}
        // Component hiển thị ở đầu danh sách (Search, DatePicker, Thống kê...)
        ListHeaderComponent={renderHeader()}
        // Render từng item (Dùng Memoized Component)
        renderItem={({ item }) => (
          <InvoiceItem
            item={item}
            isExpanded={selectedInvoice && selectedInvoice._id === item._id}
            onToggle={handleToggleInvoice}
            onRevert={handleRevertCollected}
            onPrint={handlePrintWithLatestLayout}
            onUpdateInfo={handleUpdateInfo}
          />
        )}
        // Component hiển thị ở cuối danh sách (Load More)
        ListFooterComponent={renderFooter}
        // Refresh Control
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]}
            // Chỉ enable pull-to-refresh khi KHÔNG có search/filter đang thực hiện
            enabled={suggestions.length === 0 && !searchText && !selectedDate && invoiceData.length === 0}
          />
        }
        // Tùy chỉnh hiệu năng
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true} // Quan trọng cho Android để mượt mà
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* --- CÁC MODAL VÀ VIEW ẨN --- */}
      {printerModalProps.visible && <PrinterModal {...printerModalProps} />}
      <FullScreenLoader visible={isPrinting} message="Đang in hóa đơn..." onCancel={cancelPrint} />

      <DynamicInvoiceLayout
        forwardedRef={viewShotRef}
        invoice={selectedInvoice}
        layout={invoiceLayout || DEFAULT_INVOICE_LAYOUT}
        visible={isLayoutVisible}
        pixelWidth={paperWidthPx}
      />
    </View>
  );
}
