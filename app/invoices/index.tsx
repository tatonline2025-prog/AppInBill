import { fetchallInvoice } from "@/api/invoice.api";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Text } from "@/components/StyledText";
import { useAuth } from "@/context/AuthContext";
import { InvoiceInfo } from "@/types/invoice";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { showMessage } from "react-native-flash-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();

  const [invoiceData, setInvoiceData] = useState<InvoiceInfo[]>([]);
  const [filterPrint, setFilterPrint] = useState("all");
  const [filterCollection, setFilterCollection] = useState("all");
  // const [selectedProvince, setSelectedProvince] = useState("all"); // Unused - commented out
  // const [searchInvoiceNumber, setSearchInvoiceNumber] = useState(""); // Unused - commented out

  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesPerPage, setInvoicesPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [assignedCustomerCodes, setAssignedCustomerCodes] = useState(0);
  const [unassignedCustomerCodes, setUnAssignedCustomerCodes] = useState(0);
  const [totalAmountInfo, setTotalAmountInfo] = useState(0);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();

  // ✅ Mới: modal filter
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const onChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const formattedDate = selectedDate
    ? selectedDate.toISOString().split("T")[0] // YYYY-MM-DD
    : undefined;

  // Hàm refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    if (!user) {
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetchallInvoice(
        currentPage,
        invoicesPerPage,
        filterPrint !== "all" ? (filterPrint === "not_printed" ? "not_printed" : "printed") : undefined,
        filterCollection !== "all" ? (filterCollection === "not_collected" ? "not_collected" : "collected") : undefined,
        user?._id,
        undefined,
        undefined,
        user.province,
        formattedDate
      );

      if (res?.data) {
        setTotalPages(res.data.pagination.totalPages);
        setAssignedCustomerCodes(res.data.summary.totalInvoices);
        setUnAssignedCustomerCodes(res.data.summary.unassignedInvoices);
        setTotalAmountInfo(res.data.summary.totalAmount);
        const data = res.data.data;
        setInvoiceData(data);
      }

      showMessage({
        message: "Đã làm mới dữ liệu!",
        type: "success",
        icon: "success",
      });
    } catch (error) {
      console.error("Lỗi khi refresh dữ liệu:", error);
      showMessage({
        message: "Lỗi khi làm mới dữ liệu!",
        type: "danger",
        icon: "danger",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Bật loading

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchallInvoice(
          currentPage,
          invoicesPerPage,
          filterPrint !== "all" ? (filterPrint === "not_printed" ? "not_printed" : "printed") : undefined,
          filterCollection !== "all"
            ? filterCollection === "not_collected"
              ? "not_collected"
              : "collected"
            : undefined,
          user?._id,
          undefined,
          undefined,
          user.province,
          formattedDate
        );

        // console.log(res?.data);

        if (res?.data) {
          setTotalPages(res.data.pagination.totalPages);
          setAssignedCustomerCodes(res.data.summary.totalInvoices);
          setUnAssignedCustomerCodes(res.data.summary.unassignedInvoices);
          setTotalAmountInfo(res.data.summary.totalAmount);
          const data = res.data.data;
          setInvoiceData(data);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
      } finally {
        setLoading(false); // Tắt loading
      }
    };

    fetchData();
  }, [
    user,
    currentPage,
    invoicesPerPage,
    filterPrint,
    filterCollection,
    formattedDate,
  ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Hóa đơn phụ trách",
          headerStyle: { backgroundColor: "#2563eb" },
          headerTintColor: "#fff",
        }}
      />

      <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
        <FullScreenLoader visible={loading} message="Đang tải dữ liệu hoá đơn..." />

        <Text style={styles.title}>Danh sách hoá đơn ({assignedCustomerCodes})</Text>
        <Text style={styles.title}>Danh sách hoá đơn chưa có người phụ trách ({unassignedCustomerCodes})</Text>

        {/* ✅ Chỉnh sửa: nút mở modal filter */}
        <TouchableOpacity style={styles.openFilterButton} onPress={() => setIsFilterModalVisible(true)}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>🎛️ Bộ lọc</Text>
        </TouchableOpacity>

        {/* --- Modal filter --- */}
        <Modal
          visible={isFilterModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>Bộ lọc hóa đơn</Text>

                <Text style={styles.filterLabel}>Trạng thái thu:</Text>
                <View style={styles.buttonRow}>
                  {["all", "collected", "not_collected"].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.filterButton, filterCollection === status && styles.activeButton]}
                      onPress={() => setFilterCollection(status)}
                    >
                      <Text style={[styles.filterText, filterCollection === status && styles.activeText]}>
                        {status === "all" ? "Tất cả" : status === "collected" ? "Đã thu" : "Chưa thu"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.filterLabel}>Trạng thái in:</Text>
                <View style={styles.buttonRow}>
                  {["all", "printed", "not_printed"].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.filterButton, filterPrint === status && styles.activeButton]}
                      onPress={() => setFilterPrint(status)}
                    >
                      <Text style={[styles.filterText, filterPrint === status && styles.activeText]}>
                        {status === "all" ? "Tất cả" : status === "printed" ? "Đã in" : "Chưa in"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.filterLabel, { marginTop: 10 }]}>Chọn ngày thu:</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 20,
                  }}
                >
                  <Text>{selectedDate.toLocaleDateString("vi-VN")}</Text>
                </TouchableOpacity>
                {showPicker && (
                  <DateTimePicker value={selectedDate} mode="date" display="default" onChange={onChange} />
                )}

                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.applyFilterButton}>
                  <Text style={{ color: "#fff", fontWeight: "600", textAlign: "center" }}>Áp dụng</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Text style={{ fontWeight: "600", color: "#2563eb", marginBottom: 8 }}>
          Tổng giá trị: {totalAmountInfo.toLocaleString("vi-VN")}₫
        </Text>

        {invoiceData.length === 0 ? (
          <Text style={styles.emptyText}>Không có dữ liệu hoá đơn.</Text>
        ) : (
          <FlatList
            data={invoiceData}
            keyExtractor={(item) => item._id || item.invoiceNumber}
            renderItem={({ item, index }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Hóa đơn #{index + 1 + (currentPage - 1) * invoicesPerPage}</Text>
                <Text style={styles.itemText}>
                  <Text style={styles.label}>Mã KH: </Text>
                  {item.invoiceNumber}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.label}>Tên KH: </Text>
                  {item.customerName}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.label}>Địa chỉ: </Text>
                  {item.customerAddress}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.label}>Tổng tiền: </Text>
                  {item.totalAmount}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.label}>Trạng thái thu: </Text>
                  {item.collectionStatus === "collected" ? "✅ Đã thu" : "❌ Chưa thu"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.label}>Trạng thái in: </Text>
                  {item.printStatus === "printed" ? "🖨️ Đã in" : "📄 Chưa in"}
                </Text>
              </View>
            )}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 10 }}>
          {[15, 50, 100, 200].map((num) => (
            <TouchableOpacity
              key={num}
              onPress={() => {
                setInvoicesPerPage(num);
                setCurrentPage(1);
              }}
              style={[styles.pageSizeButton, invoicesPerPage === num && styles.activeButton]}
            >
              <Text style={[styles.pageText, invoicesPerPage === num && styles.activeText]}>{num}/trang</Text>
            </TouchableOpacity>
          ))}
        </View>

        {totalPages > 1 && (
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10 }}>
            <TouchableOpacity
              disabled={currentPage === 1}
              onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
            >
              <Text style={styles.pageText}>← Trước</Text>
            </TouchableOpacity>

            <Text style={styles.pageNumber}>
              Trang {currentPage}/{totalPages}
            </Text>

            <TouchableOpacity
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
            >
              <Text style={styles.pageText}>Sau →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9", padding: 12 },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 10,
  },
  openFilterButton: {
    // ✅ Mới: nút mở modal filter
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  modalOverlay: {
    // ✅ Mới
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    // ✅ Mới
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    // ✅ Mới
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  applyFilterButton: {
    // ✅ Mới
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  filterSection: { marginBottom: 16 },
  filterGroup: { marginBottom: 10 },
  filterLabel: { fontWeight: "600", color: "#1e293b", marginBottom: 6 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between" },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  activeButton: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  filterText: { color: "#334155", fontSize: 13, fontWeight: "500" },
  activeText: { color: "#fff" },
  listContainer: { paddingBottom: 30 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#2563eb", marginBottom: 6 },
  label: { fontWeight: "600", color: "#334155" },
  itemText: { fontSize: 14, color: "#475569", marginBottom: 2 },
  emptyText: { textAlign: "center", color: "#64748b", fontSize: 15, marginTop: 20 },
  pageButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  disabledButton: { backgroundColor: "#94a3b8" },
  pageText: { color: "black", fontWeight: "600", fontSize: 13 },
  pageNumber: { alignSelf: "center", fontSize: 14, fontWeight: "500", color: "#1e293b" },
  pageSizeButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 4,
    elevation: 2,
  },
});
