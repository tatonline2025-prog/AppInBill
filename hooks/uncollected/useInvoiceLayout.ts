// --- File: hooks/useInvoiceLayout.ts ---
import { getInvoiceLayout } from "@/api/invoicelayout.api";
import { DEFAULT_INVOICE_LAYOUT, InvoiceLayoutItem } from "@/types/invoice-layout";
import { useEffect, useState } from "react";

/**
 * Hook để tải và quản lý layout hóa đơn dựa trên templateType
 * @param templateType Tên của loại template (ví dụ: "Thông báo điện Lấp Vò")
 */
export const useInvoiceLayout = (templateType: string) => {
  const [invoiceLayout, setInvoiceLayout] = useState<InvoiceLayoutItem[]>(DEFAULT_INVOICE_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLayout = async () => {
    setIsLoading(true);
    try {
      const res = await getInvoiceLayout();
      const selectedForm = res?.find((form: any) => form.templateType === templateType);

      if (selectedForm && Array.isArray(selectedForm.layout)) {
        setInvoiceLayout(selectedForm.layout);
      } else {
        setInvoiceLayout(DEFAULT_INVOICE_LAYOUT); // Fallback
      }
    } catch (err) {
      console.error("Lỗi tải layout:", err);
      setInvoiceLayout(DEFAULT_INVOICE_LAYOUT); // Fallback khi lỗi
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLayout();
  }, [templateType]); // Tải lại nếu templateType thay đổi

  return { invoiceLayout, isLoading, refetchLayout: fetchLayout };
};
