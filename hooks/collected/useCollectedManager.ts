// --- File: hooks/useCollectedManager.ts ---
import { searchInvoice_API, searchInvoiceByDate_API } from "@/api/invoice.api";
import { InvoiceInfo } from "@/types/invoice";
import { IUser } from "@/types/user";
import { toVietnamDateKey } from "@/utils/vnTimezone";
import { useEffect, useRef, useState } from "react";
import { showMessage } from "react-native-flash-message";

type SearchType = "customer" | "station" | "customerName";

const isSameVietnamDate = (dateValue: string | Date | undefined, targetDate: Date) => {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  return toVietnamDateKey(d) === toVietnamDateKey(targetDate);
};

const sumTotalAmount = (items: InvoiceInfo[]) =>
  items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

const parseSearchResponse = (res: any) => {
  const topLevelData = Array.isArray(res?.data) ? res.data : null;
  const nestedData = Array.isArray(res?.data?.data) ? res.data.data : null;
  const directData = Array.isArray(res) ? res : null;
  const data = topLevelData || nestedData || directData || [];

  const total =
    Number(res?.total) ||
    Number(res?.summary?.totalInvoices) ||
    Number(res?.data?.total) ||
    data.length ||
    0;

  const totalPages = Number(res?.totalPages) || Number(res?.data?.totalPages) || 1;
  const totalAmount =
    Number(res?.totalAmount) ||
    Number(res?.summary?.totalAmount) ||
    Number(res?.data?.totalAmount) ||
    0;

  return { data, total, totalPages, totalAmount };
};

export const useCollectedManager = (user: IUser | null) => {
  const isAdmin = user?.role === "admin";
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
        const normalizedSearchText = searchType === "station" ? searchText.trim().toUpperCase() : searchText.trim();
        // Search by station should not be restricted by collector id.
        const assignedUserId = searchType === "station" ? undefined : (isAdmin ? undefined : user._id);
        const userProvince = isAdmin ? undefined : user.province;

        // Chỉ lấy gợi ý, không set vào invoiceData chính
        const res = await searchInvoice_API(
          "collected",
          assignedUserId,
          userProvince,
          normalizedSearchText,
          searchType
        );
        const { data } = parseSearchResponse(res);

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
  }, [searchText, searchType, user, isAdmin]);

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
  const searchByText = async (codeInput?: string, isLoadMore: boolean = false, dateFilter?: Date | null) => {
    const code = codeInput ?? searchText;
    if (!user || !code.trim()) {
      showMessage({ message: "Vui lòng nhập thông tin tìm kiếm", type: "warning" });
      return;
    }

    const activeDate = dateFilter !== undefined ? dateFilter : selectedDate;
    const normalizedCode = searchType === "station" ? code.trim().toUpperCase() : code.trim();
    // Search by station should not be restricted by collector id.
    const assignedUserId = searchType === "station" ? undefined : (isAdmin ? undefined : user._id);
    const userProvince = isAdmin ? undefined : user.province;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setSuggestions([]);
      setSelectedInvoice(null);
      setInvoiceData([]);
    }

    const pageToFetch = isLoadMore ? currentPage + 1 : 1;

    try {
      const res = await searchInvoice_API(
        "collected",
        assignedUserId,
        userProvince,
        normalizedCode,
        searchType,
        pageToFetch,
        50
      );

      const parsed = parseSearchResponse(res);
      const serverData = parsed.data;
      const filteredData =
        searchType === "station" && activeDate
          ? serverData.filter((item: InvoiceInfo) => isSameVietnamDate(item.collectionDate as any, activeDate))
          : serverData;

      const totalPagesServer = parsed.totalPages;
      const amount =
        searchType === "station" && activeDate ? sumTotalAmount(filteredData) : parsed.totalAmount || 0;
      const totalInvoicesValue =
        searchType === "station" && activeDate ? filteredData.length : (parsed.total || filteredData.length);

      if (isLoadMore) {
        setInvoiceData((prev) => [...prev, ...filteredData]);
      } else {
        setInvoiceData(filteredData);

        if (filteredData.length === 0) {
          if (searchType === "station") {
            const stationCode = code.trim().toUpperCase();
            if (activeDate) {
              showMessage({
                message: `Không có hóa đơn đã thu tại mã trạm ${stationCode} trong ngày ${new Intl.DateTimeFormat('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}).format(activeDate)}.`,
                type: "danger",
              });
            } else {
              showMessage({
                message: `Không có hóa đơn đã thu ở mã trạm ${stationCode}.`,
                type: "danger",
              });
            }
          } else {
            showMessage({ message: "Không tìm thấy hóa đơn nào.", type: "danger" });
          }
        } else {
          if (searchType === "station") {
            const suffix = activeDate ? ` (lọc ngày ${new Intl.DateTimeFormat('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}).format(activeDate)})` : "";
            showMessage({
              message: `Tìm thấy ${totalInvoicesValue} hóa đơn đã thu tại mã trạm.${suffix}`,
              type: "success",
            });
          } else {
            showMessage({ message: `Tìm thấy thông tin hóa đơn.`, type: "success" });
          }

          if (searchType === "customer") {
            const exact = filteredData.find((i: any) => i.invoiceNumber?.toLowerCase() === normalizedCode.toLowerCase());
            if (exact) setSelectedInvoice(exact);
          }
        }
      }

      setCurrentPage(pageToFetch);
      setTotalPages(totalPagesServer);
      setTotalAmount(amount);
      setTotalInvoices(totalInvoicesValue);
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

    // Nếu đang tìm theo mã trạm + có searchText thì lọc theo cả mã trạm và ngày.
    if (searchType === "station" && searchText.trim()) {
      setSelectedDate(date);
      await searchByText(searchText, isLoadMore, date);
      return;
    }

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
      const dateString = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Ho_Chi_Minh'}).format(date); // YYYY-MM-DD

      // Gọi API với page và limit
      const res = await searchInvoiceByDate_API(user._id, user.province, dateString, pageToFetch, 50);

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
