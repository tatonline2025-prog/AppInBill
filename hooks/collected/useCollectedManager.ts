// --- File: hooks/useCollectedManager.ts ---
import { searchInvoice_API, searchInvoiceByDate_API } from "@/api/invoice.api";
import { InvoiceInfo } from "@/types/invoice";
import { IUser } from "@/types/user";
import { useEffect, useRef, useState } from "react";
import { showMessage } from "react-native-flash-message";

type SearchType = "customer" | "station" | "customerName";

export const useCollectedManager = (user: IUser | null) => {
  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("customer");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [invoiceData, setInvoiceData] = useState<InvoiceInfo[]>([]); // List kết quả tìm được
  const [suggestions, setSuggestions] = useState<InvoiceInfo[]>([]); // List gợi ý
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceInfo | null>(null); // Hóa đơn đang chọn xem chi tiết

  const [isLoading, setIsLoading] = useState(false);
  const isSelectionRef = useRef(false); // Cờ đánh dấu đang chọn gợi ý

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // --- 1. Xử lý gợi ý (Debounce) ---
  useEffect(() => {
    if (isSelectionRef.current || !searchText.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      if (!user) return;
      try {
        // Chỉ lấy gợi ý, không set vào invoiceData chính
        const res = await searchInvoice_API("collected", user._id, user.province, searchText, searchType);
        const data = res.data || [];

        if (searchType === "station") {
          // Lọc trùng mã trạm
          const unique = new Map();
          data.forEach((item: InvoiceInfo) => {
            if (item.recordBookCode && !unique.has(item.recordBookCode)) unique.set(item.recordBookCode, item);
          });
          setSuggestions(Array.from(unique.values()));
        } else {
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Suggestion error:", error);
      }
    }, 200);

    return () => clearTimeout(timeout);
    // ✅ Bỏ selectedDate khỏi dependency array vì nó thay đổi liên tục khi chọn ngày
    // Chỉ trigger lại khi searchText hoặc searchType hoặc user thay đổi
  }, [searchText, searchType, user]);

  const handleTextChange = (text: string) => {
    setSearchText(text);
    // Khi gõ chữ mới -> Xóa ngay kết quả cũ và chi tiết cũ để tránh nhầm lẫn
    if (invoiceData.length > 0) setInvoiceData([]);
    if (selectedInvoice) setSelectedInvoice(null);
    if (selectedDate) setSelectedDate(null);
  };

  const handleTypeChange = (type: SearchType) => {
    setSearchType(type);
    setSearchText("");
    setInvoiceData([]);
    setSuggestions([]);
    setSelectedInvoice(null);
    setSelectedDate(null);
  };

  // --- 2. Tìm kiếm theo Text (Button Search) ---
  const searchByText = async (codeInput?: string, isLoadMore: boolean = false) => {
    const code = codeInput ?? searchText;
    if (!user || !code.trim()) {
      showMessage({ message: "Vui lòng nhập thông tin tìm kiếm", type: "warning" });
      return;
    }

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setSuggestions([]);
      setSelectedDate(null);
      setSelectedInvoice(null);
      setInvoiceData([]);
    }

    const pageToFetch = isLoadMore ? currentPage + 1 : 1;

    try {
      const res = await searchInvoice_API("collected", user._id, user.province, code, searchType, pageToFetch, 100);

      const newData = res.data || [];
      const totalPagesServer = res.totalPages || 1;
      const amount = res.totalAmount || 0;

      if (isLoadMore) {
        setInvoiceData((prev) => [...prev, ...newData]);
      } else {
        setInvoiceData(newData);

        if (newData.length === 0) {
          showMessage({ message: "Không tìm thấy hóa đơn nào.", type: "danger" });
        } else {
          if (searchType === "station") {
            showMessage({ message: `Tìm thấy ${res.total || newData.length} hóa đơn.`, type: "success" });
          } else {
            showMessage({ message: `Tìm thấy thông tin hóa đơn.`, type: "success" });
          }

          if (searchType === "customer") {
            const exact = newData.find((i: any) => i.invoiceNumber?.toLowerCase() === code.toLowerCase());
            if (exact) setSelectedInvoice(exact);
          }
        }
      }

      setCurrentPage(pageToFetch);
      setTotalPages(totalPagesServer);
      setTotalAmount(amount);
      setTotalInvoices(res.total);
    } catch (error) {
      console.error(error);
      showMessage({ message: "Lỗi tìm kiếm", type: "danger" });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // --- 3. Tìm kiếm theo Ngày ---
  const searchByDate = async (date: Date, isLoadMore: boolean = false) => {
    if (!user) return;

    // Nếu là load more thì dùng state isLoadingMore để không che toàn màn hình
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      // Nếu tìm ngày mới, reset data cũ ngay lập tức
      setInvoiceData([]);
      setSearchText("");
      setSuggestions([]);
      setSelectedInvoice(null);
    }

    // Nếu không phải load more (tức là chọn ngày mới), luôn gọi trang 1.
    // Nếu là load more, gọi trang tiếp theo.
    const pageToFetch = isLoadMore ? currentPage + 1 : 1;
    // Cập nhật selectedDate để UI hiển thị đúng
    setSelectedDate(date);

    try {
      const dateString = date.toLocaleDateString("en-CA"); // YYYY-MM-DD

      // Gọi API với page và limit
      const res = await searchInvoiceByDate_API(user._id, user.province, dateString, pageToFetch, 100);

      // API trả về cấu trúc mới: { data, totalPages, currentPage, ... }
      const newData = res.data || [];
      const totalPagesServer = res.totalPages || 1;
      const amount = res.totalAmount || 0;

      if (isLoadMore) {
        setInvoiceData((prev) => [...prev, ...newData]);
      } else {
        setInvoiceData(newData);
        if (newData.length > 0) {
          showMessage({
            message: `Tìm thấy ${res.total || newData.length} hóa đơn`,
            type: "success",
          });
        } else {
          showMessage({ message: "Không có hóa đơn nào trong ngày này.", type: "warning" });
        }
      }

      setCurrentPage(pageToFetch);
      setTotalPages(totalPagesServer);
      setTotalAmount(amount);
      setTotalInvoices(res.total);
    } catch (error) {
      console.error(error);
      showMessage({ message: "Lỗi tải dữ liệu", type: "danger" });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // --- Helper functions ---
  const handleSelectSuggestion = (code: string) => {
    isSelectionRef.current = true;
    setSearchText(code);
    setSuggestions([]);
    searchByText(code);

    // Reset cờ sau 1 khoảng ngắn
    setTimeout(() => {
      isSelectionRef.current = false;
    }, 300);
  };

  const resetAll = () => {
    setSearchText("");
    setInvoiceData([]);
    setSuggestions([]);
    setSelectedInvoice(null);
    setSelectedDate(null);
  };

  return {
    searchText,
    setSearchText,
    searchType,
    setSearchType,
    selectedDate,
    invoiceData,
    setInvoiceData,
    suggestions,
    selectedInvoice,
    setSelectedInvoice,
    isLoading,
    currentPage,
    totalPages,
    totalInvoices,
    totalAmount,
    isLoadingMore, // State loading cho nút bấm
    handleTextChange,
    handleTypeChange,
    searchByText,
    searchByDate,
    handleSelectSuggestion,
    resetAll,
  };
};
