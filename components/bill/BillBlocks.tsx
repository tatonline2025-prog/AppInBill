// src/components/BillBlocks.tsx
import { InvoiceInfo } from "@/types/invoice";
import { day, month, numberToVietnameseWords } from "@/utils/printer"; // Import từ file utils mới
import React from "react";
import { View } from "react-native";
import { BillText } from "./BillText"; // Import từ BillText mới

const isMissing = (value: any) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
};

// --- Khối 1: Header ---
export const BillHeader = ({ label, customStyle }: { label: string; customStyle?: any }) => (
  <BillText
    style={[
      {
        textAlign: "center",
        fontFamily: "NotoSans-Bold",
        fontSize: 11, // Cần import  nếu chưa có
        marginBottom: 2,
        lineHeight: 12,
      },
      customStyle,
    ]}
  >
    {label}
  </BillText>
);

// --- Khối 2: Billing Period ---
export const BillBillingPeriod = ({
  invoice,
  label,
  customStyle,
}: {
  invoice: InvoiceInfo | null;
  label: string;
  customStyle?: any;
}) => {
  const billingperiod = invoice?.billing_period;
  if (!billingperiod || billingperiod === "") return null;
  return (
    <BillText style={[{ textAlign: "center", marginBottom: 4 }, customStyle]}>
      {label} {invoice?.billing_period}
    </BillText>
  );
};

// --- Khối 3: Customer Info ---
const Row = ({ label, value, valueStyle }: { label: string; value?: string; valueStyle?: any }) => {
  if (isMissing(value)) return null;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 1, marginBottom: 1 }}>
      <BillText style={valueStyle}>
        {label}:{"  "}
      </BillText>
      <BillText style={[{ fontFamily: "NotoSans-Regular", flexShrink: 1, textAlign: "right" }, valueStyle]}>
        {value}
      </BillText>
    </View>
  );
};

export const BillCustomerCode = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => (
  <Row label={label} value={invoice?.invoiceNumber} valueStyle={{ fontFamily: "NotoSans-Bold" }} />
);
export const BillCustomerName = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => (
  <Row label={label} value={invoice?.customerName} valueStyle={{ fontFamily: "NotoSans-Bold" }} />
);
export const BillCustomerAddress = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => {
  const value = invoice?.customerAddress;

  if (isMissing(value)) return null;

  return (
    <View style={{ marginBottom: 1 }}>
      {/* textAlign: 'justify' giúp văn bản khi dài sẽ căn đều 2 bên mép giấy, 
         trông sẽ đẹp và chuyên nghiệp hơn, bù đắp lại việc không thể căn phải dòng đầu.
      */}
      <BillText style={{ textAlign: "justify" }}>
        {/* Phần Label: In đậm để phân biệt */}
        <BillText>{label}: </BillText>

        {/* Phần Value: Viết liền mạch để khi xuống dòng sẽ tràn sang trái */}
        <BillText>
          {" "}
          {"  "}
          {value}
        </BillText>
      </BillText>
    </View>
  );
};

// --- Khối 4: Amount Details ---
const ConditionalAmountRow = ({
  invoice,
  label,
  isCurrent,
}: {
  invoice: InvoiceInfo | null;
  label: string;
  isCurrent: boolean;
}) => {
  const amount = isCurrent ? Number(invoice?.currentAmount) || 0 : Number(invoice?.previousAmount) || 0;
  const previous = Number(invoice?.previousAmount) || 0;

  // Logic: nếu là kỳ trước VÀ bằng 0 → ẩn
  if (!isCurrent && previous === 0) return null;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 1, marginBottom: 1 }}>
      <BillText>{label}:</BillText>
      <BillText style={{ fontFamily: "NotoSans-Regular", flexShrink: 1, textAlign: "right" }}>
        {amount.toLocaleString("vi-VN")}
      </BillText>
    </View>
  );
};

export const BillCurrentAmount = (props: { invoice: InvoiceInfo | null; label: string }) => (
  <ConditionalAmountRow {...props} isCurrent={true} />
);

export const BillPreviousAmount = (props: { invoice: InvoiceInfo | null; label: string }) => (
  <ConditionalAmountRow {...props} isCurrent={false} />
);

// --- Khối 5: Total Amount ---
export const BillTotalAmountNumber = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1, alignItems: "flex-start" }}>
    <BillText>{label}:</BillText>
    <BillText style={{ fontFamily: "NotoSans-Regular", flex: 1, textAlign: "right" }}>
      {(Number(invoice?.totalAmount) || 0).toLocaleString("vi-VN")} VND
    </BillText>
  </View>
);

export const BillTotalAmountWords = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => {
  const fee = Number(invoice?.assignedTo?.collectionFee) || 0;
  const total = Number(invoice?.totalAmount) || 0;

  const combined = total + fee;

  return (
    <View style={{ marginBottom: 1 }}>
      <BillText style={{ textAlign: "justify" }}>
        <BillText>{label}: </BillText>
        <BillText>
          {" "}
          {"  "}
          {numberToVietnameseWords(Number(combined)) || "Không"} đồng
        </BillText>
      </BillText>
    </View>
  );
};

// --- Khối 6: Collector Info ---
export const BillCollectorSeparator = ({ label }: { label: string }) => (
  <View style={{ alignItems: "center", marginTop: 5, marginBottom: 5 }}>
    <BillText style={{ fontFamily: "NotoSans-Regular" }}>{label}</BillText>
  </View>
);

export const BillCollectorName = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => (
  <Row label={label} value={invoice?.assignedTo?.fullName} />
);

export const BillCollectorPhone = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => (
  <Row label={label} value={invoice?.assignedTo?.phone} />
);

export const BillTimestamp = ({ label }: { label: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1, alignItems: "flex-start" }}>
    <BillText>{label}:</BillText>
    <BillText style={{ fontFamily: "NotoSans-Regular", flex: 1, textAlign: "right" }}>
      {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} {`${day}/${month}`}
    </BillText>
  </View>
);

// --- Khối 7: Footer ---
export const BillFooter = ({ label }: { label: string }) => (
  <View style={{ marginTop: 6, marginBottom: 6, alignItems: "center" }}>
    <BillText
      style={{
        fontFamily: "NotoSans-Regular",
        textAlign: "center",
        textTransform: "uppercase",
        fontSize: 7,
      }}
    >
      {label}
    </BillText>
  </View>
);

export const BillTopDateTime = ({ note, label }: { note?: string; label: string }) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "flex-start" }}>
      <BillText>{label}:</BillText>
      <BillText style={{ flex: 1, textAlign: "right" }}>
        {dateStr} {timeStr}
      </BillText>
    </View>
  );
};

export const BillCompanyInfo = ({
  name,
  address,
  phoneservice,
}: {
  name: string;
  address: string;
  phoneservice: string;
}) => (
  <View
    style={{
      marginBottom: 6,
      // borderBottomWidth: 1,
      // borderBottomColor: "#000",
      // borderStyle: "dashed",
      gap: 2,
    }}
  >
    <BillText
      style={{
        fontFamily: "NotoSans-Bold",
        textTransform: "uppercase",
        textAlign: "center",
        fontSize: 11,
        lineHeight: 12,
      }}
    >
      {name}
    </BillText>
    <BillText style={{ textAlign: "left" }}>{address}</BillText>
    <BillText style={{ textAlign: "center" }}>{phoneservice}</BillText>
  </View>
);

export const BillDateRange = ({ invoice }: { invoice: InvoiceInfo | null }) => {
  const period = invoice?.billing_period; // Ví dụ: "10/2025"

  // 1. Kiểm tra dữ liệu đầu vào có đúng định dạng "mm/yyyy" không
  if (!period || !period.includes("/")) return null;

  try {
    const [monthStr, yearStr] = period.split("/");
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    // Kiểm tra tính hợp lệ của số tháng/năm
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;

    // 2. Tính toán ngày
    // - Ngày đầu: Luôn là 01
    // - Ngày cuối: Dùng thủ thuật `new Date(year, month, 0)` trong JS
    //   (Ngày 0 của tháng sau chính là ngày cuối cùng của tháng hiện tại)
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    // Format lại cho đẹp (đảm bảo 2 chữ số)
    const fmtMonth = month.toString().padStart(2, "0");
    const startDate = `01/${fmtMonth}/${year}`;
    const endDate = `${lastDayOfMonth}/${fmtMonth}/${year}`;

    return (
      <BillText style={{ textAlign: "center", marginBottom: 4, fontStyle: "italic" }}>
        (từ ngày {startDate} đến ngày {endDate})
      </BillText>
    );
  } catch {
    // Nếu có lỗi parse, ẩn luôn dòng này
    return null;
  }
};

export const BillCustomerPhone = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => (
  <Row label={label} value={invoice?.customerPhone} />
);

export const BillReferenceCode = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => (
  <Row label={label} value={invoice?.recordBookCode!} />
);

export const BillNote = ({ label }: { label: string }) => {
  return (
    <View
      style={{
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <BillText style={{ fontFamily: "NotoSans-Regular", textAlign: "justify" }}>{label} </BillText>
    </View>
  );
};

export const BillCollectionFee = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => {
  const fee = Number(invoice?.assignedTo?.collectionFee) || 0;
  if (fee === 0) return null;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1, alignItems: "flex-start" }}>
      <BillText>{label}:</BillText>
      <BillText style={{ fontFamily: "NotoSans-Regular", flex: 1, textAlign: "right" }}>
        {fee.toLocaleString("vi-VN") || 0} VND
      </BillText>
    </View>
  );
};

export const BillTotalCollection = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => {
  const fee = Number(invoice?.assignedTo?.collectionFee) || 0;
  const total = Number(invoice?.totalAmount) || 0;
  if (fee === 0) return null;

  const combined = total + fee;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1, alignItems: "flex-start" }}>
      <BillText style={{ fontFamily: "NotoSans-Bold" }}>{label}:</BillText>
      <BillText style={{ fontFamily: "NotoSans-Bold", flex: 1, textAlign: "right" }}>
        {combined.toLocaleString("vi-VN") || 0} VND
      </BillText>
    </View>
  );
};
