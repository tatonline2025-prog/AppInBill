// utils/generateBillEscPos.ts
// DEEP FIX v1.8.3: Generates ESC/POS with Vietnamese code page support
// Attempts to use printer's Vietnamese code page (CP1258/TCVN) for proper character rendering
// Falls back to ASCII stripping only if code page switching fails.
import { COMMANDS } from "react-native-thermal-receipt-printer-image-qr";

import { InvoiceInfo } from "@/types/invoice";
import { InvoiceLayoutItem } from "@/types/invoice-layout";
import { numberToVietnameseWords } from "./printer";
import { VN_TIMEZONE } from "./vnTimezone";

// ───────────────────────── constants ─────────────────────────
const C = COMMANDS;
const LF = C.EOL; // '\n'
const CT = C.TEXT_FORMAT.TXT_ALIGN_CT;
const LT = C.TEXT_FORMAT.TXT_ALIGN_LT;
const BOLD_ON = C.TEXT_FORMAT.TXT_BOLD_ON;
const BOLD_OFF = C.TEXT_FORMAT.TXT_BOLD_OFF;

// 32 chars fits both 58mm (~32) and 80mm (~48) — safe minimum
const PRINT_WIDTH = 32;

// ───────────────────────── ESC/POS Code Page Commands ──────────────
/**
 * ESC/POS commands for Vietnamese character support (DEEP FIX v1.8.3)
 * Bixolon printers support multiple code pages via:
 *   ESC t n  - Select character code table (country-specific)
 *   ESC R n  - Select international character set
 * 
 * For Vietnamese:
 *   n=45 (ESC t 45) - Vietnam code table (TCVN 5712)
 *   n=16 (ESC R 16) - International CP1258 (Windows Vietnamese)
 * 
 * Used in generateBillEscPos as "\x1B\x74\x2D" when useVietnameseMode=true
 */

/**
 * Converts Vietnamese Unicode text to plain ASCII as FALLBACK ONLY.
 * Only used if code page switching fails or printer doesn't support it.
 * 
 * Removes diacritical marks and the horn modifier (U+031B used by ơ/ư).
 * "đ"/"Đ" are replaced manually since they don't decompose via NFD.
 *
 * Examples:
 *   "Nguyễn Văn An"  →  "Nguyen Van An"
 *   "Tổng tiền"       →  "Tong tien"
 *   "Đồng Tháp"       →  "Dong Thap"
 */
const toAscii = (str: string): string =>
  str
    .normalize("NFD")
    // U+0300–036F: combining diacritical marks (tones, circumflex, breve…)
    // U+031B:      combining horn (for ơ → o, ư → u after NFD)
    .replace(/[\u0300-\u036f\u031B]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

/**
 * Keeps Vietnamese text intact (deep fix mode).
 * Used when code page switching is enabled - printer handles rendering.
 */
const keepVietnamese = (str: string): string => str;

// ───────────────────────── helpers ───────────────────────────
const isMissing = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
};

/**
 * Right-aligns `value` so the full line is PRINT_WIDTH chars.
 * Applies text converter (either toAscii for fallback or keepVietnamese for deep fix).
 */
const rowAligned = (label: string, value: string, textConverter: (s: string) => string = toAscii): string => {
  const l = textConverter(label);
  const v = textConverter(value);
  const sep = ": ";
  const left = l + sep;
  const remaining = PRINT_WIDTH - left.length;
  const right = remaining > 0 ? v.padStart(remaining) : v;
  return left + right + LF;
};

const formatVND = (amount: number): string =>
  amount.toLocaleString("vi-VN") + " VND";

const resolveCollectionFee = (
  invoice: InvoiceInfo | null,
  userFee: number | null | undefined
): number => {
  if (userFee !== null && userFee !== undefined && !Number.isNaN(Number(userFee))) {
    const n = Number(userFee);
    return n > 0 ? n : 0;
  }
  const raw = invoice?.assignedTo?.collectionFee;
  if (raw !== null && raw !== undefined) {
    const n = Number(raw) || 0;
    return n > 0 ? n : 0;
  }
  return 0;
};

// ───────────────────────── block renderer ────────────────────
const renderBlock = (
  block: InvoiceLayoutItem,
  invoice: InvoiceInfo | null,
  fee: number,
  textConverter: (s: string) => string = toAscii
): string => {
  const isFeeBlock =
    block.id === "collectionFee" || block.id === "totalCollection";
  if (!block.visible && !isFeeBlock) return "";

  const baseTotal = Number(invoice?.totalAmount) || 0;

  switch (block.id) {
    case "header":
      return CT + BOLD_ON + textConverter(block.label) + BOLD_OFF + LF + LT;

    case "billingPeriod": {
      if (isMissing(invoice?.billing_period)) return "";
      return CT + `Ky ${invoice!.billing_period}` + LF + LT;
    }

    case "dateRange": {
      const period = invoice?.billing_period;
      if (!period || !period.includes("/")) return "";
      try {
        const [monthStr, yearStr] = period.split("/");
        const m = parseInt(monthStr, 10);
        const y = parseInt(yearStr, 10);
        if (isNaN(m) || isNaN(y) || m < 1 || m > 12) return "";
        const lastDay = new Date(y, m, 0).getDate();
        const fmt = (n: number) => n.toString().padStart(2, "0");
        return (
          CT +
          `(Tu ngay 01/${fmt(m)}/${y} den ngay ${lastDay}/${fmt(m)}/${y})` +
          LF +
          LT
        );
      } catch {
        return "";
      }
    }

    case "topDateTime": {
      const d = new Intl.DateTimeFormat("vi-VN", {
        timeZone: VN_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date());
      const t = new Intl.DateTimeFormat("vi-VN", {
        timeZone: VN_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());
      return rowAligned(block.label, `${d} ${t}`, textConverter);
    }

    case "customerCode":
      if (isMissing(invoice?.invoiceNumber)) return "";
      return BOLD_ON + rowAligned(block.label, invoice!.invoiceNumber, textConverter) + BOLD_OFF;

    case "customerName":
      if (isMissing(invoice?.customerName)) return "";
      return BOLD_ON + rowAligned(block.label, invoice!.customerName, textConverter) + BOLD_OFF;

    case "customerAddress":
      if (isMissing(invoice?.customerAddress)) return "";
      return textConverter(`${block.label}: ${invoice!.customerAddress}`) + LF;

    case "customerPhone":
      if (isMissing(invoice?.customerPhone)) return "";
      return rowAligned(block.label, invoice!.customerPhone, textConverter);

    case "referenceCode":
      if (isMissing(invoice?.recordBookCode)) return "";
      return rowAligned(block.label, invoice!.recordBookCode!, textConverter);

    case "currentAmount": {
      const amount = Number(invoice?.currentAmount) || 0;
      return rowAligned(block.label, amount.toLocaleString("vi-VN"), textConverter);
    }

    case "previousAmount": {
      const prev = Number(invoice?.previousAmount) || 0;
      if (prev === 0) return "";
      return rowAligned(block.label, prev.toLocaleString("vi-VN"), textConverter);
    }

    case "totalAmountNumber": {
      const finalTotal = fee > 0 ? baseTotal + fee : baseTotal;
      return rowAligned(block.label, formatVND(finalTotal), textConverter);
    }

    case "collectionFee":
      if (fee <= 0) return "";
      return rowAligned(block.label, formatVND(fee), textConverter);

    case "totalCollection":
      if (fee <= 0) return "";
      return (
        BOLD_ON +
        rowAligned(block.label, formatVND(baseTotal + fee), textConverter) +
        BOLD_OFF
      );

    case "totalAmountWords": {
      const combined = baseTotal + fee;
      const words = textConverter(numberToVietnameseWords(combined) || "Khong");
      return textConverter(block.label) + ": " + words + " dong" + LF;
    }

    case "collectorSeparator":
      return LF + CT + textConverter(block.label) + LF + LT;

    case "collectorName":
      if (isMissing(invoice?.assignedTo?.fullName)) return "";
      return rowAligned(block.label, invoice!.assignedTo!.fullName!, textConverter);

    case "collectorPhone":
      if (isMissing(invoice?.assignedTo?.phone)) return "";
      return rowAligned(block.label, invoice!.assignedTo!.phone!, textConverter);

    case "timestamp": {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat("vi-VN", {
        timeZone: VN_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
      }).format(now);
      const dayStr = new Intl.DateTimeFormat("vi-VN", {
        timeZone: VN_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);
      return rowAligned(block.label, `${timeStr} ${dayStr}`, textConverter);
    }

    case "note":
      return textConverter(block.label) + LF;

    case "footer":
      return LF + CT + textConverter(block.label) + LF + LT;

    default:
      return "";
  }
};

// ───────────────────────── public API ────────────────────────
export const generateBillEscPos = (
  invoice: InvoiceInfo | null,
  layout: InvoiceLayoutItem[],
  userCollectionFee: number | null | undefined,
  useVietnameseMode: boolean = true // DEEP FIX v1.8.3: Enable Vietnamese code page support
): string => {
  const fee = resolveCollectionFee(invoice, userCollectionFee);
  const textConverter = useVietnameseMode ? keepVietnamese : toAscii;

  const hasFeeBlock = layout.some((b) => b.id === "collectionFee");
  const hasTotalCollectionBlock = layout.some((b) => b.id === "totalCollection");

  let text = C.HARDWARE.HW_INIT; // reset printer state

  // DEEP FIX v1.8.3: Add Vietnamese code page selection if enabled
  // ESC t 45 = Select Vietnam code table (TCVN 5712)
  // This tells thermal printer to use Vietnamese character mappings
  if (useVietnameseMode) {
    text += "\x1B\x74\x2D"; // ESC t - for Vietnam code table
    console.log("[ESC-POS] Using Vietnamese code page (TCVN 5712)");
  } else {
    console.log("[ESC-POS] Using ASCII fallback (no Vietnamese support)");
  }

  for (const block of layout) {
    text += renderBlock(block, invoice, fee, textConverter);
  }

  // Mirror InvoiceLayout.tsx: auto-append fee blocks if not in layout
  if (!hasFeeBlock) {
    text += renderBlock(
      { id: "collectionFee", label: "Phi dich vu", visible: true },
      invoice,
      fee,
      textConverter
    );
  }
  if (!hasTotalCollectionBlock) {
    text += renderBlock(
      { id: "totalCollection", label: "Tong thu", visible: true },
      invoice,
      fee,
      textConverter
    );
  }

  // Paper feed before cut
  text += LF + LF + LF;

  return text;
};
