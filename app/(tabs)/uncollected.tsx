// --- File: app/(tabs)/uncollected.tsx ---
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView } from "react-native";
import { showMessage } from "react-native-flash-message";
import ViewShot from "react-native-view-shot";

// --- Import API & Component ---
import { fetch20InvoiceLargest, fetchTop3Stations, handleToggle_API, handleToggleIsPaid_API } from "@/api/invoice.api";
import { DynamicInvoiceLayout, DynamicNotiInvoiceLayout } from "@/components/InvoiceLayout";
import PrinterModal from "@/components/PrinterModal";
import InvoiceResults from "@/components/uncollected/InvoiceResults";
import SearchInput from "@/components/uncollected/SearchInput";

// --- Import Hooks ---
import InvoiceList from "@/components/uncollected/InvoiceList";
import TopStationsList, { StationSummary } from "@/components/uncollected/TopStationsList";
import { useAuth } from "@/context/AuthContext";
import { useInvoiceLayout } from "@/hooks/uncollected/useInvoiceLayout";
import { useUncollectedSearch } from "@/hooks/uncollected/useUncollectedSearch";
import { useInvoicePrinter } from "@/hooks/useInvoicePrinter";
import { InvoiceInfo } from "@/types/invoice";

/* ============================================
   MÀN HÌNH: DANH SÁCH HÓA ĐƠN CHƯA THU
   ============================================ */
export default function Uncollected() {
  const { user, loading } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [uncolInvoice, setUnColInvoice] = useState<InvoiceInfo[]>([]);
  const [topStation, setTopStations] = useState<StationSummary[]>([]);

  const notiViewShotRef = useRef<ViewShot>(null); // Cho Thông báo
  const receiptViewShotRef = useRef<ViewShot>(null); // Cho Biên nhận

  // --- Sử dụng Custom Hooks để quản lý state và logic ---
  const { invoiceLayout: notiLayout, refetchLayout: refetchNoti } = useInvoiceLayout("Thông báo điện Lấp Vò");
  const { invoiceLayout: receiptLayout, refetchLayout: refetchReceipt } = useInvoiceLayout("Biên nhận thanh toán");

  const {
    customerCode,
    invoice,
    invoiceData,
    suggestions,
    searchType,
    isSearch,
    totalInvoices,
    totalAmount,
    setInvoice,
    setInvoiceData,
    handleChange,
    handleSelectSuggestion,
    handleSearch,
    setSearchType,
    resetSearch,
    handleLoadMore,
    hasMore,
    isLoading,
    isLoadingMore,
    // Thêm các biến cho checkbox lọc isPaid
    showPaidFilter,
    setShowPaidFilter,
    handleTogglePaidFilter,
    isAdmin,
  } = useUncollectedSearch(user);

  const notiPrinter = useInvoicePrinter(notiViewShotRef, invoice);
  const receiptPrinter = useInvoicePrinter(receiptViewShotRef, invoice);

  // --- Xử lý điều hướng nếu chưa đăng nhập ---
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user]);

  const fetchUncollectedData = useCallback(async () => {
    try {
      const res = await fetch20InvoiceLargest("not_collected");

      // Kiểm tra null/undefined trước khi set data
      const data = res?.data?.data || [];
      setUnColInvoice(data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      setUnColInvoice([]); // Set empty array on error
    }
  }, []);

  const fetchTop3StationsByRevenue = useCallback(async () => {
    try {
      const res = await fetchTop3Stations("not_collected");

      // Kiểm tra null/undefined trước khi set data
      const data = res?.data?.data || [];

      setTopStations(data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách trạm:", error);
      setTopStations([]); // Set empty array on error
    }
  }, []);

  const handleUpdateInfo = useCallback(
    (updatedInvoice: InvoiceInfo) => {
      setUnColInvoice((prevList) => prevList.map((item) => (item._id === updatedInvoice._id ? updatedInvoice : item)));

      setInvoice(updatedInvoice);

      if (isSearch) {
        if (setInvoiceData) {
          setInvoiceData((prevList) =>
            prevList.map((item) => (item._id === updatedInvoice._id ? updatedInvoice : item))
          );
        } else {
          handleSearch(customerCode, searchType);
        }
      }

      showMessage({ message: "Thông tin đã được cập nhật", type: "success" });
    },
    [setInvoice, isSearch, customerCode, searchType, handleSearch, setInvoiceData]
  );

  // Chỉ load dữ liệu một lần khi màn hình được mount
  // Không dùng useFocusEffect vì sẽ gây reload liên tục khi chuyển tab
  useEffect(() => {
    fetchUncollectedData();
    fetchTop3StationsByRevenue();
  }, [fetchUncollectedData, fetchTop3StationsByRevenue]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Tải lại cả 2 layout
      await Promise.all([refetchNoti(), refetchReceipt(), fetchUncollectedData(), fetchTop3StationsByRevenue()]);
      resetSearch();
      showMessage({ message: "Đã làm mới dữ liệu", type: "success" });
    } catch (error) {
      console.error("Lỗi refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchNoti, refetchReceipt, resetSearch, fetchUncollectedData, fetchTop3StationsByRevenue]);

  // --- Các hàm xử lý hành động (Action Handlers) ---
  const handleMarkAsCollected = async (selectedInvoice?: InvoiceInfo) => {
    const targetInvoice = selectedInvoice || invoice;
    if (!targetInvoice) return;

    Alert.alert("Xác nhận thu tiền", "Bạn có chắc chắn muốn đánh dấu hóa đơn này là đã thu?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        style: "destructive",
        onPress: async () => {
          const token = await AsyncStorage.getItem("token");
          if (!token) {
            showMessage({ message: "Lỗi xác thực, vui lòng đăng nhập lại.", type: "danger" });
            return;
          }

          try {
            await handleToggle_API(targetInvoice._id, "collectionStatus");
            showMessage({ message: "Đã xác nhận thu thành công!", type: "success" });

            // Cập nhật invoice hiện tại với trạng thái "collected" thay vì xóa nó đi
            const updatedInvoice = {
              ...targetInvoice,
              collectionStatus: "collected" as const,
              collectionDate: new Date().toISOString(),
            };
            setInvoice(updatedInvoice);

            // Lọc bỏ hóa đơn đã thu khỏi danh sách invoiceData (thay vì chỉ cập nhật trạng thái)
            // Điều này đảm bảo hóa đơn không còn hiển thị trong danh sách chưa thu
            if (isSearch && setInvoiceData && invoiceData) {
              setInvoiceData((prevList) =>
                prevList.filter((item) => item._id !== targetInvoice._id)
              );
            }

            // Cập nhật trong danh sách uncolInvoice (danh sách chưa thu)
            setUnColInvoice((prevList) => prevList.filter((item) => item._id !== targetInvoice._id));

            // Cập nhật lại top stations
            fetchTop3StationsByRevenue();
          } catch (error: any) {
            console.error("Lỗi cập nhật:", error);
            showMessage({
              message: error?.response?.data?.message || "Không thể cập nhật trạng thái.",
              type: "danger",
            });
          }
        },
      },
    ]);
  };

  const handleIsPaid = async (selectedInvoice?: InvoiceInfo) => {
    const targetInvoice = selectedInvoice || invoice;
    if (!targetInvoice) return;

    Alert.alert("Xác nhận chuyển đổi trạng thái đóng cước", "Bạn có chắc chắn muốn chuyển đổi trạng thái đóng cước?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        style: "destructive",
        onPress: async () => {
          try {
            await handleToggleIsPaid_API(targetInvoice._id);
            // Hiển thị message tùy theo trạng thái mới
            const newIsPaid = !targetInvoice.isPaid;
            showMessage({ 
              message: newIsPaid ? "Đã đóng cước thành công!" : "Hoàn lại đóng cước thành công!", 
              type: "success" 
            });

            // Cập nhật invoice hiện tại thay vì xóa nó đi
            const updatedInvoice = {
              ...targetInvoice,
              isPaid: !targetInvoice.isPaid,
            };
            setInvoice(updatedInvoice);

            // Cập nhật trong danh sách invoiceData nếu đang tìm kiếm
            if (isSearch && setInvoiceData && invoiceData) {
              setInvoiceData((prevList) =>
                prevList.map((item) => (item._id === targetInvoice._id ? updatedInvoice : item))
              );
            }

            // Cập nhật trong danh sách uncolInvoice (danh sách chưa thu)
            setUnColInvoice((prevList) =>
              prevList.map((item) => (item._id === targetInvoice._id ? updatedInvoice : item))
            );

            // Cập nhật lại top stations
            fetchTop3StationsByRevenue();
          } catch (error: any) {
            console.error("Lỗi cập nhật:", error);
            showMessage({
              message: error?.response?.data?.message || "Không thể cập nhật trạng thái.",
              type: "danger",
            });
          }
        },
      },
    ]);
  };

  const handlePrintNotification = async (selectedInvoice?: InvoiceInfo) => {
    const targetInvoice = selectedInvoice || invoice;
    if (!targetInvoice) return;

    // Cập nhật invoice hiện tại để in đúng hóa đơn
    setInvoice(targetInvoice);
    
    try {
      await refetchNoti(); // Load layout thông báo mới nhất
      await new Promise((resolve) => setTimeout(resolve, 300)); // Đợi render
      await notiPrinter.handlePrintInvoice(); // Gọi hàm in của instance Thông báo
    } catch (error) {
      console.error("Lỗi in thông báo:", error);
      Alert.alert("Lỗi", "Không thể in thông báo.");
    }
  };

  const handlePrintReceipt = async (selectedInvoice?: InvoiceInfo) => {
    const targetInvoice = selectedInvoice || invoice;
    if (!targetInvoice) return;

    // Cập nhật invoice hiện tại để in đúng hóa đơn
    setInvoice(targetInvoice);
    
    try {
      await refetchReceipt(); // Load layout biên nhận mới nhất
      await new Promise((resolve) => setTimeout(resolve, 300)); // Đợi render
      await receiptPrinter.handlePrintInvoice(); // Gọi hàm in của instance Biên nhận
    } catch (error) {
      console.error("Lỗi in biên nhận:", error);
      Alert.alert("Lỗi", "Không thể in biên nhận.");
    }
  };

  const invoiceActions = {
    onMarkCollected: handleMarkAsCollected,
    onPrint: handlePrintNotification,
    onPrintInvoice: handlePrintReceipt,
    onIsPaid: handleIsPaid,
  };

  /* ==========================================================
     GIAO DIỆN CHÍNH (đã gọn gàng hơn)
     ========================================================== */
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: "#f8fafc",
        alignItems: "center",
        padding: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563eb"]}
          // Chỉ enable pull-to-refresh khi KHÔNG có search đang thực hiện
          enabled={suggestions?.length === 0 && !isSearch}
        />
      }
    >
      {/* 1. Component tìm kiếm */}
      <SearchInput
        customerCode={customerCode}
        onChange={handleChange}
        onSearch={handleSearch}
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        searchType={searchType}
        onChangeSearchType={setSearchType}
        showPaidFilter={showPaidFilter}
        onTogglePaidFilter={handleTogglePaidFilter}
        isAdmin={isAdmin}
      />

      {/* 2. Component hiển thị kết quả (tự động quyết định) */}
      <InvoiceResults
        isSearch={isSearch}
        loading={isLoading}
        searchType={searchType}
        customerCode={customerCode}
        // invoice={invoice}
        invoiceData={invoiceData}
        onSelectInvoice={setInvoice}
        onMarkCollected={handleMarkAsCollected}
        onPrint={handlePrintNotification}
        onPrintInvoice={handlePrintReceipt}
        onIsPaid={handleIsPaid}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        totalInvoices={totalInvoices}
        totalAmount={totalAmount}
        onUpdateInfo={handleUpdateInfo}
      />
      {searchType === "customer" && !isSearch && (
        <>
          <TopStationsList
            title={"3 trạm hoá đơn chưa thu nhiều tiền nhất"}
            stations={topStation}
            onSelectStation={(name) => {
              setSearchType("station");
              handleSearch(name, "station");
            }}
          />

          <InvoiceList
            title={"20 hoá đơn chưa thu nhiều tiền nhất"}
            invoices={uncolInvoice}
            onSelectInvoice={setInvoice}
            actions={invoiceActions}
            onUpdateInfo={handleUpdateInfo}
          />
        </>
      )}
      {/* 3. Modal in (ẩn) */}
      {notiPrinter?.printerModalProps?.visible && <PrinterModal {...notiPrinter.printerModalProps} />}
      {receiptPrinter?.printerModalProps?.visible && <PrinterModal {...receiptPrinter.printerModalProps} />}
      {/* 4. Layout in (ẩn) */}
      {/* 1. Layout Thông Báo */}
      <DynamicNotiInvoiceLayout forwardedRef={notiViewShotRef} invoice={invoice} layout={notiLayout} visible={false} />
      {/* 2. Layout Biên Nhận (Thêm mới) */}
      <DynamicInvoiceLayout
        forwardedRef={receiptViewShotRef}
        invoice={invoice}
        layout={receiptLayout}
        visible={false}
      />
    </ScrollView>
  );
}
