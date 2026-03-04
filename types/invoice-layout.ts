// src/types/invoice-layout.ts

export interface InvoiceLayoutItem {
  id: string;
  label: string;
  visible: boolean;
  textOverride?: string;
}

export const DEFAULT_INVOICE_LAYOUT: InvoiceLayoutItem[] = [
  { id: "header", label: "BIÊN NHẬN THANH TOÁN", visible: true },
  { id: "billingPeriod", label: "Kỳ", visible: true },
  { id: "customerCode", label: "Mã KH", visible: true },
  { id: "customerName", label: "Tên KH", visible: true },
  { id: "customerAddress", label: "Địa chỉ", visible: true },
  { id: "currentAmount", label: "Kỳ này", visible: true },
  { id: "previousAmount", label: "Kỳ trước", visible: true },
  { id: "totalAmountNumber", label: "Tổng tiền", visible: true },
  { id: "totalAmountWords", label: "Bằng chữ", visible: true },
  { id: "collectorSeparator", label: "*****", visible: true },
  { id: "collectorName", label: "Người thu", visible: true },
  { id: "collectorPhone", label: "SĐT", visible: true },
  { id: "timestamp", label: "Thời gian", visible: true },
  { id: "footer", label: "XIN CẢM ƠN QUÝ KHÁCH!", visible: true },
];
