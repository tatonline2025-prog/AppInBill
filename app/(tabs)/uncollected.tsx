// --- File: app/(tabs)/uncollected.tsx ---
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { showMessage } from "react-native-flash-message";
import ViewShot from "react-native-view-shot";

// --- Import API & Component ---
import { fetch20InvoiceLargest, fetchTop3Stations, handleToggle_API, handleToggleIsPaid_API, updateInvoice } from "@/api/invoice.api";
import FullScreenLoader from "@/components/FullScreenLoader";
import { DynamicInvoiceLayout, DynamicNotiInvoiceLayout } from "@/components/InvoiceLayout";
import PrinterModal from "@/components/PrinterModal";
import InvoiceResults from "@/components/uncollected/InvoiceResults";
import SearchInput from "@/components/uncollected/SearchInput";

// --- Import Hooks ---
import TopStationsList, { StationSummary } from "@/components/uncollected/TopStationsList";
import { useAuth } from "@/context/AuthContext";
import { useInvoiceLayout } from "@/hooks/uncollected/useInvoiceLayout";
import { useUncollectedSearch } from "@/hooks/uncollected/useUncollectedSearch";
import { useInvoicePrinter } from "@/hooks/useInvoicePrinter";
import { InvoiceInfo } from "@/types/invoice";
import { toVietnamISOString } from "@/utils/vnTimezone";

/* ============================================
   MÀN HÌNH: DANH SÁCH HÓA ĐƠN CHƯA THU
   ============================================ */
export default function Uncollected() {
  const { user, loading } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [uncolInvoice, setUnColInvoice] = useState<InvoiceInfo[]>([]);
  const [topStation, setTopStations] = useState<StationSummary[]>([]);

  const notiViewShotRef = useRef<ViewShot>(null);
  const receiptViewShotRef = useRef<ViewShot>(null);

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
  const isAnyPrinting = notiPrinter.isPrinting || receiptPrinter.isPrinting;
  const cancelAnyPrint = async () => {
    await notiPrinter.cancelPrint();
    await receiptPrinter.cancelPrint();
  };
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

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      showMessage({ message: "Lỗi xác thực, vui lòng đăng nhập lại.", type: "danger" });
      return;
    }

    try {
      const response = await handleToggle_API(targetInvoice._id, "collectionStatus");

      // Gán người phụ trách = người bấm "Xác nhận đã thu", nhưng nếu là admin thì giữ người cũ
      const currentAssigned =
        typeof targetInvoice.assignedTo === "object" && targetInvoice.assignedTo
          ? targetInvoice.assignedTo
          : null;

      const isAdmin = user?.role === "admin";
      const hasExistingAssigned = !!currentAssigned?._id;

      if (user?._id && !(isAdmin && hasExistingAssigned)) {
        await updateInvoice(targetInvoice._id, { assignedTo: user._id }).catch(() => {});
      }
      showMessage({ message: "Đã xác nhận thu thành công!", type: "success" });

      const assignedForUpdate =
        isAdmin && hasExistingAssigned
          ? currentAssigned
          : {
              _id: user?._id || currentAssigned?._id,
              fullName: user?.fullName || currentAssigned?.fullName,
              collectionFee: user?.collectionFee ?? currentAssigned?.collectionFee,
            };

      const updatedInvoice = response?.data?.invoice || {
        ...targetInvoice,
        collectionStatus: "collected" as const,
        collectionDate: toVietnamISOString(),
        assignedTo: assignedForUpdate,
      };
      setInvoice(updatedInvoice);

      // Lọc bỏ hóa đơn đã thu khỏi danh sách invoiceData (thay vì chỉ cập nhật trạng thái)
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
            const response = await handleToggleIsPaid_API(targetInvoice._id);
            // Hiển thị message tùy theo trạng thái mới
            const newIsPaid = !targetInvoice.isPaid;
            showMessage({ 
              message: newIsPaid ? "Đã đóng cước thành công!" : "Hoàn lại đóng cước thành công!", 
              type: "success" 
            });

            // Cập nhật invoice hiện tại thay vì xóa nó đi
            const currentAssigned =
              typeof targetInvoice.assignedTo === "object" && targetInvoice.assignedTo
                ? targetInvoice.assignedTo
                : null;

            const updatedInvoice = response?.data?.invoice || {
              ...targetInvoice,
              isPaid: !targetInvoice.isPaid,
              assignedTo: {
                _id: user?._id || currentAssigned?._id,
                fullName: user?.fullName || currentAssigned?.fullName,
                collectionFee: user?.collectionFee ?? currentAssigned?.collectionFee,
              },
            };
            setInvoice(updatedInvoice);

            // Cập nhật trong danh sách invoiceData nếu đang tìm kiếm
            if (isSearch && setInvoiceData && invoiceData) {
              setInvoiceData((prevList) => {
                if (showPaidFilter && !newIsPaid) {
                  return prevList.filter((item) => item._id !== targetInvoice._id);
                }

                return prevList.map((item) => (item._id === targetInvoice._id ? updatedInvoice : item));
              });
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
      // Do not block printing when layout API is slow/unavailable.
      refetchNoti().catch((err) => console.warn("Refetch noti layout failed:", err));
      await new Promise((resolve) => setTimeout(resolve, 120)); // Đợi render
      // Truyền trực tiếp hóa đơn vào hàm in để đảm bảo in đúng hóa đơn được bấm
      await notiPrinter.handlePrintInvoice(targetInvoice);
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
      // Do not block printing when layout API is slow/unavailable.
      refetchReceipt().catch((err) => console.warn("Refetch receipt layout failed:", err));
      await new Promise((resolve) => setTimeout(resolve, 120)); // Đợi render
      // Truyền trực tiếp hóa đơn vào hàm in để đảm bảo in đúng hóa đơn được bấm
      await receiptPrinter.handlePrintInvoice(targetInvoice); 
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
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
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
          selectedInvoice={invoice}
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
          isPrinting={isAnyPrinting}
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

            {/* <InvoiceList
            title={"20 hoá đơn chưa thu nhiều tiền nhất"}
            invoices={uncolInvoice}
            onSelectInvoice={setInvoice}
            actions={invoiceActions}
            onUpdateInfo={handleUpdateInfo}
          />  */}
          </>
        )}
      </ScrollView>

      {/* 3. Modal in */}
      {notiPrinter?.printerModalProps?.visible && <PrinterModal {...notiPrinter.printerModalProps} />}
      {receiptPrinter?.printerModalProps?.visible && <PrinterModal {...receiptPrinter.printerModalProps} />}
      <FullScreenLoader
        visible={notiPrinter.isPrinting || receiptPrinter.isPrinting}
        message="Đang in hóa đơn..."
        onCancel={cancelAnyPrint}
      />
      {/* 4. Layout in (ngoài ScrollView để đảm bảo capture ảnh chính xác trên Android) */}
      <DynamicNotiInvoiceLayout
        forwardedRef={notiViewShotRef}
        invoice={invoice}
        layout={notiLayout}
        visible={notiPrinter.isLayoutVisible}
        pixelWidth={notiPrinter.paperWidthPx}
      />
      <DynamicInvoiceLayout
        forwardedRef={receiptViewShotRef}
        invoice={invoice}
        layout={receiptLayout}
        visible={receiptPrinter.isLayoutVisible}
        pixelWidth={receiptPrinter.paperWidthPx}
      />
    </View>
  );
}
