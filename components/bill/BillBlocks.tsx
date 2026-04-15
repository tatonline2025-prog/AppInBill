// src/components/BillBlocks.tsx
import { useAuth } from "@/context/AuthContext";
import { InvoiceInfo } from "@/types/invoice";
import { day, month, numberToVietnameseWords } from "@/utils/printer"; // Import tá»« file utils má»›i
import React from "react";
import { View } from "react-native";
import { BillText } from "./BillText"; // Import tá»« BillText má»›i
import { VN_TIMEZONE } from "@/utils/vnTimezone";

const isMissing = (value: any) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
};
const resolveCollectionFee = (invoice: InvoiceInfo | null, userFee?: number) => {
  // If current user fee is explicitly set (including 0), always honor it.
  // This keeps behavior consistent: fee > 0 shows; fee = 0 hides.
  if (userFee !== null && userFee !== undefined && !Number.isNaN(Number(userFee))) {
    const normalizedUserFee = Number(userFee);
    return normalizedUserFee > 0 ? normalizedUserFee : 0;
  }

  const assignedFeeRaw = invoice?.assignedTo?.collectionFee;
  if (assignedFeeRaw !== null && assignedFeeRaw !== undefined) {
    const assignedFee = Number(assignedFeeRaw) || 0;
    return assignedFee > 0 ? assignedFee : 0;
  }

  return 0;
};

// --- Khá»‘i 1: Header ---
export const BillHeader = ({ label, customStyle }: { label: string; customStyle?: any }) => (
  <BillText
    style={[
      {
        textAlign: "center",
        fontFamily: "NotoSans-Bold",
        fontSize: 11, // Cáº§n import  náº¿u chÆ°a cĂ³
        marginBottom: 2,
        lineHeight: 12,
      },
      customStyle,
    ]}
  >
    {label}
  </BillText>
);

// --- Khá»‘i 2: Billing Period ---
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

// --- Khá»‘i 3: Customer Info ---
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
      {/* textAlign: 'justify' giĂºp vÄƒn báº£n khi dĂ i sáº½ cÄƒn Ä‘á»u 2 bĂªn mĂ©p giáº¥y, 
         trĂ´ng sáº½ Ä‘áº¹p vĂ  chuyĂªn nghiá»‡p hÆ¡n, bĂ¹ Ä‘áº¯p láº¡i viá»‡c khĂ´ng thá»ƒ cÄƒn pháº£i dĂ²ng Ä‘áº§u.
      */}
      <BillText style={{ textAlign: "justify" }}>
        {/* Pháº§n Label: In Ä‘áº­m Ä‘á»ƒ phĂ¢n biá»‡t */}
        <BillText>{label}: </BillText>

        {/* Pháº§n Value: Viáº¿t liá»n máº¡ch Ä‘á»ƒ khi xuá»‘ng dĂ²ng sáº½ trĂ n sang trĂ¡i */}
        <BillText>
          {" "}
          {"  "}
          {value}
        </BillText>
      </BillText>
    </View>
  );
};

// --- Khá»‘i 4: Amount Details ---
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

  // Logic: náº¿u lĂ  ká»³ trÆ°á»›c VĂ€ báº±ng 0 â†’ áº©n
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

// --- Khá»‘i 5: Total Amount ---
export const BillTotalAmountNumber = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => {
  const { user } = useAuth();
  const fee = resolveCollectionFee(invoice, user?.collectionFee);
  const baseTotal = Number(invoice?.totalAmount) || 0;
  const finalTotal = fee > 0 ? baseTotal + fee : baseTotal;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1, alignItems: "flex-start" }}>
      <BillText>{label}:</BillText>
      <BillText style={{ fontFamily: "NotoSans-Regular", flex: 1, textAlign: "right" }}>
        {finalTotal.toLocaleString("vi-VN")} VND
      </BillText>
    </View>
  );
};

export const BillTotalAmountWords = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => {
  const { user } = useAuth();
  const fee = resolveCollectionFee(invoice, user?.collectionFee);
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

// --- Khá»‘i 6: Collector Info ---
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
      {new Intl.DateTimeFormat("vi-VN", {
        timeZone: VN_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()) + ` ${day}/${month}`}
    </BillText>
  </View>
);

// --- Khá»‘i 7: Footer ---
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
  const dateStr = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const timeStr = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

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
  const period = invoice?.billing_period; // VĂ­ dá»¥: "10/2025"

  // 1. Kiá»ƒm tra dá»¯ liá»‡u Ä‘áº§u vĂ o cĂ³ Ä‘Ăºng Ä‘á»‹nh dáº¡ng "mm/yyyy" khĂ´ng
  if (!period || !period.includes("/")) return null;

  try {
    const [monthStr, yearStr] = period.split("/");
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    // Kiá»ƒm tra tĂ­nh há»£p lá»‡ cá»§a sá»‘ thĂ¡ng/nÄƒm
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;

    // 2. TĂ­nh toĂ¡n ngĂ y
    // - NgĂ y Ä‘áº§u: LuĂ´n lĂ  01
    // - NgĂ y cuá»‘i: DĂ¹ng thá»§ thuáº­t `new Date(year, month, 0)` trong JS
    //   (NgĂ y 0 cá»§a thĂ¡ng sau chĂ­nh lĂ  ngĂ y cuá»‘i cĂ¹ng cá»§a thĂ¡ng hiá»‡n táº¡i)
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    // Format láº¡i cho Ä‘áº¹p (Ä‘áº£m báº£o 2 chá»¯ sá»‘)
    const fmtMonth = month.toString().padStart(2, "0");
    const startDate = `01/${fmtMonth}/${year}`;
    const endDate = `${lastDayOfMonth}/${fmtMonth}/${year}`;

    return (
      <BillText style={{ textAlign: "center", marginBottom: 4, fontStyle: "italic" }}>
        {`(T\u1EEB ng\u00E0y ${startDate} \u0111\u1EBFn ng\u00E0y ${endDate})`}
      </BillText>
    );
  } catch {
    // Náº¿u cĂ³ lá»—i parse, áº©n luĂ´n dĂ²ng nĂ y
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
  const { user } = useAuth();
  const fee = resolveCollectionFee(invoice, user?.collectionFee);
  // Chá»‰ hiá»ƒn thá»‹ khi fee > 0
  if (!fee || fee <= 0) return null;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1, alignItems: "flex-start" }}>
      <BillText>{label}:</BillText>
      <BillText style={{ fontFamily: "NotoSans-Regular", flex: 1, textAlign: "right" }}>
        {fee.toLocaleString("vi-VN")} VND
      </BillText>
    </View>
  );
};



export const BillTotalCollection = ({ invoice, label }: { invoice: InvoiceInfo | null; label: string }) => {
  const { user } = useAuth();
  const fee = resolveCollectionFee(invoice, user?.collectionFee);
  const total = Number(invoice?.totalAmount) || 0;
  // Chá»‰ hiá»ƒn thá»‹ khi fee > 0
  if (!fee || fee <= 0) return null;

  const combined = total + fee;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1, alignItems: "flex-start" }}>
      <BillText style={{ fontFamily: "NotoSans-Bold" }}>{label}:</BillText>
      <BillText style={{ fontFamily: "NotoSans-Bold", flex: 1, textAlign: "right" }}>
        {combined.toLocaleString("vi-VN")} VND
      </BillText>
    </View>
  );
};





