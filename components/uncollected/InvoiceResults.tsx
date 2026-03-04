// --- File: components/uncollected/InvoiceResults.tsx ---
import { InvoiceInfo } from "@/types/invoice";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import InvoiceDetail from "./InvoiceDetail"; // Import thêm InvoiceDetail
import InvoiceList from "./InvoiceList";

type InvoiceResultsProps = {
  isSearch: number;
  loading: boolean;
  searchType: string;
  customerCode: string;
  invoiceData: InvoiceInfo[];
  onSelectInvoice: (invoice: InvoiceInfo | null) => void;
  onMarkCollected: (invoice?: InvoiceInfo) => void;
  onPrint: (invoice?: InvoiceInfo) => void;
  onPrintInvoice: (invoice?: InvoiceInfo) => void;
  onIsPaid: (invoice?: InvoiceInfo) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  totalInvoices?: number;
  totalAmount?: number;
  onUpdateInfo?: (updatedInvoice: InvoiceInfo) => void;
};

export default function InvoiceResults({
  isSearch,
  loading,
  searchType,
  customerCode,
  invoiceData,
  onSelectInvoice,
  onMarkCollected,
  onPrint,
  onPrintInvoice,
  onIsPaid,
  onLoadMore,
  hasMore,
  isLoadingMore,
  totalInvoices,
  totalAmount,
  onUpdateInfo,
}: InvoiceResultsProps) {
  if (loading) {
    return (
      <View style={{ marginTop: 30, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (isSearch !== 1 || invoiceData.length === 0) return null;

  if (invoiceData.length === 0) {
    return (
      <View style={{ marginTop: 20, alignItems: "center" }}>
        <Text style={{ color: "#64748b" }}>Chưa tìm thấy dữ liệu.</Text>
      </View>
    );
  }

  // Khi không có search query (checkbox filter) hoặc searchType không phải "customer" → hiển thị danh sách
  const isListView = searchType !== "customer" || !customerCode.trim();

  if (isListView) {
    const title = searchType === "station"
      ? `Danh sách hoá đơn của trạm ${customerCode.toUpperCase()}:`
      : `Danh sách hoá đơn của ${customerCode}:`;

    return (
      <InvoiceList
        title={title}
        invoices={invoiceData}
        onSelectInvoice={onSelectInvoice}
        actions={{
          onMarkCollected,
          onPrint,
          onPrintInvoice,
          onIsPaid,
        }}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoading={isLoadingMore}
        totalInvoices={totalInvoices}
        totalAmount={totalAmount}
        onUpdateInfo={onUpdateInfo}
      />
    );
  }

  // searchType === "customer" và có customerCode → hiển thị chi tiết 1 hóa đơn
  const targetInvoice = invoiceData[0];

  return (
    <View style={{ width: "100%", marginTop: 10 }}>
      <InvoiceDetail
        invoice={targetInvoice}
        onMarkCollected={() => onMarkCollected(targetInvoice)}
        onPrint={() => onPrint(targetInvoice)}
        onPrintInvoice={() => onPrintInvoice(targetInvoice)}
        onIsPaid={() => onIsPaid(targetInvoice)}
        onUpdateInfo={onUpdateInfo}
      />
    </View>
  );
}

