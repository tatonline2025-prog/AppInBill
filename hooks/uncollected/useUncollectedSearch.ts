// --- File: hooks/useUncollectedSearch.ts ---
import { fetchAllPaidInvoices_API, searchInvoice_API } from "@/api/invoice.api";
import { InvoiceInfo } from "@/types/invoice";
import { IUser } from "@/types/user";
import { useCallback, useEffect, useRef, useState } from "react";
import { showMessage } from "react-native-flash-message";

type SearchType = "customer" | "station" | "customerName";

export const useUncollectedSearch = (user: IUser | null) => {
  const [customerCode, setCustomerCode] = useState("");
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceInfo[]>([]);
  const [totalInvoices, setTotalInvoices] = useState<number>();
  const [totalAmount, setTotalAmount] = useState<number>();
  const [suggestions, setSuggestions] = useState<InvoiceInfo[]>([]);

  const [searchType, setSearchType] = useState<SearchType>("customer");
  const [isSearch, setIsSearch] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // State cho checkbox lọc hóa đơn đã đóng cước
  const [showPaidFilter, setShowPaidFilter] = useState(false);

  const isSelectionRef = useRef(false);

  const isAdmin = user?.role === "admin";

  // --- 1. Hàm gọi API lấy tất cả hóa đơn đã đóng cước ---
  const fetchAllPaidInvoices = useCallback(
    async (pageToFetch: number = 1) => {
      try {
        setIsLoading(true);

        console.log("=== DEBUG FETCH ALL PAID INVOICES ===");
        console.log("isAdmin:", isAdmin);
        console.log("user._id:", user?._id);
        console.log("user.province:", user?.province);
        
        // Xác định assignedUserId và province:
        // - Admin: KHÔNG truyền assignedUserId (xem tất cả)
        // - Admin: KHÔNG truyền province (xem tất cả các tỉnh)
        // - User: Truyền assignedUserId và province (xem của mình)
        const assignedUserId = isAdmin ? undefined : (user?._id || undefined);
        const userProvince = isAdmin ? undefined : (user?.province || undefined);

        console.log("assignedUserId (final):", assignedUserId);
        console.log("userProvince (final):", userProvince);
        console.log("pageToFetch:", pageToFetch);

        const res = await fetchAllPaidInvoices_API(
          assignedUserId,
          userProvince,
          pageToFetch,
          100
        );

        console.log("=== API RESPONSE ===");
        console.log("res:", res);
        console.log("res type:", typeof res);
        console.log("res.data:", res?.data);
        console.log("Array.isArray(res?.data):", Array.isArray(res?.data));

        setIsLoading(false);

        // Xử lý response - có thể backend trả về nhiều cấu trúc khác nhau
        let newData: InvoiceInfo[] = [];
        let total = 0;
        let totalAmountValue = 0;

        if (res) {
          // Trường hợp 1: res.data là array (backend trả về array trực tiếp)
          if (Array.isArray(res.data)) {
            newData = res.data;
            total = res.total || newData.length;
            totalAmountValue = res.totalAmount || 0;
          }
          // Trường hợp 2: res.data.data là array (backend wrap trong data)
          else if (Array.isArray(res.data?.data)) {
            newData = res.data.data;
            total = res.data.total || newData.length;
            totalAmountValue = res.data.totalAmount || 0;
          }
          // Trường hợp 3: res là array trực tiếp
          else if (Array.isArray(res)) {
            newData = res;
            total = newData.length;
          }
          // Trường hợp 4: res có property data là array
          else if (Array.isArray(res?.data?.data)) {
            newData = res.data.data;
            total = res.data.total || newData.length;
            totalAmountValue = res.data.totalAmount || 0;
          }
        }

        console.log("=== PROCESSED DATA ===");
        console.log("newData length:", newData?.length);
        console.log("total:", total);
        console.log("totalAmountValue:", totalAmountValue);

        if (pageToFetch === 1) {
          setInvoiceData(newData);
        } else {
          setInvoiceData((prev) => [...prev, ...newData]);
        }

        setTotalInvoices(total);
        setTotalAmount(totalAmountValue);
        setIsSearch(1); // Đánh dấu đang hiển thị kết quả

        if (newData.length >= total) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        if (total === 0) {
          showMessage({ message: "Không có hóa đơn đã đóng cước", type: "info" });
        } else {
          showMessage({ message: `Tìm thấy ${total} hóa đơn đã đóng cước`, type: "success" });
        }
      } catch (error: any) {
        setIsLoading(false);
        console.error("Lỗi lấy hóa đơn đã đóng cước:", error);
        console.error("Error response:", error?.response?.data);
        showMessage({ message: error?.message || "Lỗi khi tải dữ liệu", type: "danger" });
      }
    },
    [user, isAdmin]
  );

  // --- 2. Hàm gọi API tìm kiếm ---
  const fetchData = useCallback(
    async (code: string, type: SearchType, pageToFetch: number = 1, paidFilter?: boolean) => {
      if (!code.trim()) return { data: [], total: 0 };
      
      try {
        // Backend so sánh isPaid === "true" (string), nên cần chuyển đổi
        const isPaidValue = paidFilter !== undefined 
          ? (paidFilter ? "true" : "false") 
          : (showPaidFilter ? "true" : undefined);

// Xác định assignedUserId:
        // - Admin: LUÔN LUÔN KHÔNG truyền assignedUserId (xem tất cả)
        // - User: Truyền assignedUserId (xem của mình)
        const shouldShowAll = isAdmin;
        const assignedUserId = shouldShowAll ? undefined : (user?._id || undefined);
        
        // Admin: KHÔNG truyền province (xem tất cả các tỉnh)
        // User: Truyền province nếu có
        const userProvince = isAdmin ? undefined : (user?.province || undefined);

        // Debug log
        console.log("=== DEBUG SEARCH ===");
        console.log("type:", type);
        console.log("code:", code);
        console.log("assignedUserId:", assignedUserId);
        console.log("userProvince:", user?.province);
        console.log("isPaidValue:", isPaidValue);
        console.log("isAdmin:", isAdmin);

        if (type === "station") {
          const res = await searchInvoice_API(
            "not_collected",
            assignedUserId,
            userProvince,
            code.trim(),
            "station",
            pageToFetch,
            100,
            isPaidValue
          );

          console.log("API Response (station):", res);

          if (res && Array.isArray(res.data)) {
            return {
              data: res.data,
              total: res.summary?.totalInvoices || res.total || 0,
              totalAmount: res.summary?.totalAmount || res.totalAmount || 0,
            };
          } else {
            return { data: [], total: 0, totalAmount: 0 };
          }
        }

        if (!user) return { data: [], total: 0 };
        
        const res = await searchInvoice_API(
          "not_collected",
          assignedUserId,
          userProvince,
          code.trim(),
          type,
          pageToFetch,
          100,
          isPaidValue
        );

        console.log("API Response:", res);

        if (res && Array.isArray(res.data)) {
          return {
            data: res.data,
            total: res.total || 0,
            totalAmount: res.totalAmount || 0,
          };
        } else {
          return { data: [], total: 0, totalAmount: 0 };
        }
      } catch (error) {
        console.error("Search error:", error);
        return { data: [], total: 0, totalAmount: 0 };
      }
    },
    [user, showPaidFilter, isAdmin]
  );

  // --- 3. Xử lý Debounce cho Gợi ý ---
  useEffect(() => {
    if (isSelectionRef.current) {
      isSelectionRef.current = false;
      return;
    }

    if (customerCode.trim() === "") {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const res = await fetchData(customerCode, searchType);
      const data = res.data;

      if (searchType === "station") {
        const uniqueRecordBooks = new Map<string, InvoiceInfo>();
        data.forEach((item: any) => {
          if (item.recordBookCode && !uniqueRecordBooks.has(item.recordBookCode)) {
            uniqueRecordBooks.set(item.recordBookCode, item);
          }
        });
        setSuggestions(Array.from(uniqueRecordBooks.values()));
      } else {
        setSuggestions(data);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [customerCode, searchType, fetchData]);

  // --- 4. Các hàm xử lý sự kiện ---

  const handleChange = (text: string) => {
    setCustomerCode(text);
    if (isSearch === 1) setIsSearch(0);
  };

  const handleSelectSuggestion = (code: string) => {
    isSelectionRef.current = true;
    setCustomerCode(code);
    setSuggestions([]);
    handleSearch(code);
  };

  // Hàm xử lý khi toggle checkbox lọc isPaid
  // QUAN TRỌNG: Không cần phải có mã tìm kiếm
  const handleTogglePaidFilter = (value: boolean) => {
    console.log("=== DEBUG TOGGLE PAID FILTER ===");
    console.log("value received:", value);
    console.log("current showPaidFilter:", showPaidFilter);
    
    setShowPaidFilter(value);

    if (value) {
      console.log("Calling fetchAllPaidInvoices...");
      // Khi bật checkbox → Lấy tất cả hóa đơn đã đóng cước (KHÔNG cần search)
      fetchAllPaidInvoices(1);
    } else {
      // Khi tắt checkbox → Reset về danh sách mặc định
      setInvoiceData([]);
      setInvoice(null);
      setIsSearch(0);
      setTotalInvoices(0);
      setTotalAmount(0);
    }
  };

  // Hàm tìm kiếm chính thức
  const handleSearch = async (inputCode?: string, typeOverride?: SearchType, paidFilterOverride?: boolean) => {
    const rawCode = inputCode !== undefined ? inputCode : customerCode;
    const finalCode = (rawCode || "").trim();

    if (inputCode !== undefined) {
      setCustomerCode(inputCode);
    }

    const currentSearchType = typeOverride || searchType;
    
    // Sử dụng paidFilterOverride nếu được truyền, không thì dùng showPaidFilter
    const currentPaidFilter = paidFilterOverride !== undefined ? paidFilterOverride : showPaidFilter;

    if (!finalCode) {
      showMessage({ message: "Vui lòng nhập thông tin tìm kiếm.", type: "warning", icon: "warning" });
      return;
    }

    setIsLoading(true);
    setIsSearch(1);
    setInvoice(null);
    setSuggestions([]);
    setPage(1);

    // Gọi API trang 1
    const res = await fetchData(finalCode, currentSearchType, 1, currentPaidFilter);

    setIsLoading(false);

    if (!res || !res.data || res.data.length === 0) {
      setInvoiceData([]);
      showMessage({ message: "Không tìm thấy hóa đơn nào phù hợp.", type: "danger", icon: "danger" });
      return;
    }

    const newData = res.data;
    const total = res.total || 0;
    const totalAmount = res.totalAmount || 0;

    setInvoiceData(newData);
    setTotalInvoices(total);
    setTotalAmount(totalAmount);

    if (newData.length >= total) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }

    if (currentSearchType === "station" || currentSearchType === "customerName") {
      showMessage({
        message: `Tìm thấy ${total} hóa đơn.`,
        type: "success",
        icon: "success",
      });
    } else if (currentSearchType === "customer") {
      const found = newData.find(
        (item: any) =>
          item?.invoiceNumber?.toLowerCase().includes(finalCode.toLowerCase()) ||
          item?.customerName?.toLowerCase().includes(finalCode.toLowerCase())
      );
      const targetInvoice = found || newData[0];

      if (targetInvoice) {
        setInvoice(targetInvoice);
        showMessage({ message: "Tìm thấy thông tin hoá đơn.", type: "success", icon: "success" });
      }
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    // Nếu đang xem hóa đơn đã đóng cước (không có search query)
    if (showPaidFilter && !customerCode.trim()) {
      const nextPage = page + 1;
      setIsLoadingMore(true);
      await fetchAllPaidInvoices(nextPage);
      setPage(nextPage);
      setIsLoadingMore(false);
      return;
    }

    // Nếu đang tìm kiếm
    const nextPage = page + 1;
    setIsLoadingMore(true);

    const finalCode = customerCode.trim();

    const res = await fetchData(finalCode, searchType, nextPage);

    if (res && res.data) {
      setInvoiceData((prev) => [...prev, ...res.data]);
      setPage(nextPage);

      if (nextPage * 100 >= res.total) {
        setHasMore(false);
      }
    }
    setIsLoadingMore(false);
  };

  const reset = () => {
    setCustomerCode("");
    setInvoice(null);
    setInvoiceData([]);
    setSuggestions([]);
    setIsSearch(0);
    setIsLoading(false);
  };

  return {
    customerCode,
    invoice,
    invoiceData,
    suggestions,
    searchType,
    isSearch,
    isLoading,
    hasMore,
    isLoadingMore,
    totalInvoices,
    totalAmount,
    setInvoice,
    setInvoiceData,
    handleChange,
    handleSelectSuggestion,
    handleSearch,
    handleLoadMore,
    setSearchType: (type: string) => {
      setSearchType(type as SearchType);
      reset();
    },
    resetSearch: reset,
    showPaidFilter,
    setShowPaidFilter,
    handleTogglePaidFilter,
    isAdmin,
  };
};
