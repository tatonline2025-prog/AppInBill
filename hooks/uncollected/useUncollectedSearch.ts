// --- File: hooks/useUncollectedSearch.ts ---
import { fetchallInvoice, fetchAllPaidInvoices_API, searchInvoice_API, searchInvoiceByStationCode_API } from "@/api/invoice.api";
import { InvoiceInfo } from "@/types/invoice";
import { IUser } from "@/types/user";
import { useCallback, useEffect, useRef, useState } from "react";
import { showMessage } from "react-native-flash-message";

type SearchType = "customer" | "station" | "customerName";

type SearchResult = {
  data: InvoiceInfo[];
  total: number;
  totalAmount: number;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const parseSearchResponse = (res: any): SearchResult => {
  // Backend responses are not fully consistent across endpoints.
  // Normalize everything to one shape for UI consumption.
  const topLevelData = Array.isArray(res?.data) ? res.data : null;
  const nestedData = Array.isArray(res?.data?.data) ? res.data.data : null;
  const directData = Array.isArray(res) ? res : null;
  const data = topLevelData || nestedData || directData || [];

  const total =
    Number(res?.summary?.totalInvoices) ||
    Number(res?.total) ||
    Number(res?.data?.total) ||
    data.length ||
    0;

  const totalAmount =
    Number(res?.summary?.totalAmount) ||
    Number(res?.totalAmount) ||
    Number(res?.data?.totalAmount) ||
    0;

  return { data, total, totalAmount };
};

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
  const customerNameSearchCacheRef = useRef<Map<string, SearchResult>>(new Map());

  // ✅ isAdmin được sử dụng trong hook này để phân quyền xem hóa đơn
  const isAdmin = user?.role === "admin";

  // --- 1. Hàm gọi API lấy tất cả hóa đơn đã đóng cước ---
  const fetchAllPaidInvoices = useCallback(
    async (pageToFetch: number = 1) => {
      try {
        setIsLoading(true);

        // Uncollected invoices must be visible for all users.
        const assignedUserId = undefined;
        const userProvince = isAdmin ? undefined : (user?.province || undefined);


        const res = await fetchAllPaidInvoices_API(
          assignedUserId,
          userProvince,
          pageToFetch,
          50
        );


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
    async (
      code: string,
      type: SearchType,
      pageToFetch: number = 1,
      paidFilter?: boolean,
      enableDeepFallback: boolean = false
    ): Promise<SearchResult> => {
      if (!code.trim()) return { data: [], total: 0, totalAmount: 0 };
      
      try {
        const normalizedCode = type === "station" ? code.trim().toUpperCase() : code.trim();

        // Backend so sánh isPaid === "true" (string), nên cần chuyển đổi
        const isPaidValue =
          paidFilter === true ? "true" : (showPaidFilter ? "true" : undefined);

        // Với tab hóa đơn chưa thu: luôn bỏ lọc theo người thu để mọi tài khoản cùng thấy dữ liệu.
        const assignedUserId = undefined;
        
        // Với tab hóa đơn chưa thu: luôn bỏ lọc province để mọi tài khoản cùng thấy dữ liệu.
        const userProvince = undefined;


        if (!user) return { data: [], total: 0, totalAmount: 0 };

        // Khi tìm theo trạm: dùng endpoint riêng không filter status/isPaid
        // để hiển thị đầy đủ tất cả hoá đơn của trạm và hỗ trợ load more đúng
        if (type === "station") {
          const stationRes = await searchInvoiceByStationCode_API(normalizedCode, pageToFetch, 50);
          return parseSearchResponse(stationRes);
        }

        const res = await searchInvoice_API(
          "not_collected",
          assignedUserId,
          userProvince,
          normalizedCode,
          type,
          pageToFetch,
          50,
          isPaidValue
        );

        const parsed = parseSearchResponse(res);

        // Customer-name search can be incomplete on some backend versions.
        // Run multiple queries (accented + non-accented) and merge to avoid missing invoices.
        if (type === "customerName") {
          const normalizedKeywordRaw = normalizeText(normalizedCode);
          const cacheKey = `${normalizedKeywordRaw}|${pageToFetch}|${isPaidValue ?? "all"}`;
          if (enableDeepFallback && pageToFetch === 1) {
            const cached = customerNameSearchCacheRef.current.get(cacheKey);
            if (cached) return cached;
          }

          const fallbackCustomerNameNoAccentRes =
            normalizedKeywordRaw && normalizedKeywordRaw !== normalizedCode
              ? await searchInvoice_API(
                  "not_collected",
                  assignedUserId,
                  userProvince,
                  normalizedKeywordRaw,
                  "customerName",
                  pageToFetch,
                  50,
                  isPaidValue
                )
              : undefined;

          const fallbackCustomerRes = await searchInvoice_API(
            "not_collected",
            assignedUserId,
            userProvince,
            normalizedCode,
            "customer",
            pageToFetch,
            50,
            isPaidValue
          );
          const fallbackCustomerNoAccentRes =
            normalizedKeywordRaw && normalizedKeywordRaw !== normalizedCode
              ? await searchInvoice_API(
                  "not_collected",
                  assignedUserId,
                  userProvince,
                  normalizedKeywordRaw,
                  "customer",
                  pageToFetch,
                  50,
                  isPaidValue
                )
              : undefined;

          const fallbackCustomerNameNoAccentParsed = fallbackCustomerNameNoAccentRes
            ? parseSearchResponse(fallbackCustomerNameNoAccentRes)
            : null;
          const fallbackCustomerParsed = parseSearchResponse(fallbackCustomerRes);
          const fallbackCustomerNoAccentParsed = fallbackCustomerNoAccentRes
            ? parseSearchResponse(fallbackCustomerNoAccentRes)
            : null;
          const keyword = normalizedKeywordRaw;
          const filteredPrimary = parsed.data.filter((item) =>
            normalizeText(item.customerName || "").includes(keyword)
          );
          const filteredCustomerNameNoAccent = (fallbackCustomerNameNoAccentParsed?.data || []).filter((item) =>
            normalizeText(item.customerName || "").includes(keyword)
          );
          const filteredCustomer = fallbackCustomerParsed.data.filter((item) =>
            normalizeText(item.customerName || "").includes(keyword)
          );
          const filteredCustomerNoAccent = (fallbackCustomerNoAccentParsed?.data || []).filter((item) =>
            normalizeText(item.customerName || "").includes(keyword)
          );
          const mergedById = new Map<string, InvoiceInfo>();
          [
            ...filteredPrimary,
            ...filteredCustomerNameNoAccent,
            ...filteredCustomer,
            ...filteredCustomerNoAccent,
          ].forEach((item) => {
            if (item?._id) mergedById.set(item._id, item);
          });

          // Deep fallback: only when user explicitly searches and quick queries returned too few items.
          // This keeps normal searches fast while still fixing edge cases caused by incomplete backend search.
          const shouldRunDeepFallback = enableDeepFallback && mergedById.size <= 1;
          if (shouldRunDeepFallback) {
            const maxPages = 8;
            const pageSize = 200;
            const firstPageRes = await fetchallInvoice(
              1,
              pageSize,
              undefined,
              "not_collected",
              undefined,
              undefined,
              undefined,
              undefined
            );
            const firstPageData = Array.isArray(firstPageRes?.data?.data) ? firstPageRes.data.data : [];
            const totalPages = Number(firstPageRes?.data?.pagination?.totalPages) || 1;

            firstPageData.forEach((item: InvoiceInfo) => {
              if (item?._id && normalizeText(item.customerName || "").includes(keyword)) {
                mergedById.set(item._id, item);
              }
            });

            const upperPage = Math.min(totalPages, maxPages);
            const batchSize = 3;
            for (let startPage = 2; startPage <= upperPage; startPage += batchSize) {
              const endPage = Math.min(startPage + batchSize - 1, upperPage);
              const pageRequests: Promise<any>[] = [];
              for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
                pageRequests.push(
                  fetchallInvoice(
                    pageNumber,
                    pageSize,
                    undefined,
                    "not_collected",
                    undefined,
                    undefined,
                    undefined,
                    undefined
                  )
                );
              }

              const batchResults = await Promise.all(pageRequests);
              batchResults.forEach((fullPageRes) => {
                const pageData = Array.isArray(fullPageRes?.data?.data) ? fullPageRes.data.data : [];
                pageData.forEach((item: InvoiceInfo) => {
                  if (item?._id && normalizeText(item.customerName || "").includes(keyword)) {
                    mergedById.set(item._id, item);
                  }
                });
              });
            }
          }

          const merged = Array.from(mergedById.values());
          const result: SearchResult = {
            data: merged,
            total: merged.length,
            totalAmount: merged.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
          };
          if (enableDeepFallback && pageToFetch === 1) {
            customerNameSearchCacheRef.current.set(cacheKey, result);
            if (customerNameSearchCacheRef.current.size > 20) {
              const oldestKey = customerNameSearchCacheRef.current.keys().next().value;
              if (oldestKey) customerNameSearchCacheRef.current.delete(oldestKey);
            }
          }
          return result;
        }

        return parsed;
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

  const handleSelectSuggestion = (item: InvoiceInfo) => {
    const code =
      searchType === "station"
        ? item.recordBookCode || ""
        : searchType === "customerName"
        ? item.customerName || ""
        : item.invoiceNumber || "";

    if (!code) return;

    isSelectionRef.current = true;
    setCustomerCode(code);
    setSuggestions([]);
    handleSearch(code, searchType, undefined, item._id);
  };

  // Hàm xử lý khi toggle checkbox lọc isPaid
  // QUAN TRỌNG: Không cần phải có mã tìm kiếm
  const handleTogglePaidFilter = (value: boolean) => {
    setShowPaidFilter(value);

    if (value) {
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
  const handleSearch = async (
    inputCode?: string,
    typeOverride?: SearchType,
    paidFilterOverride?: boolean,
    preferredInvoiceId?: string
  ) => {
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
    const normalizedSearchCode = currentSearchType === "station" ? finalCode.toUpperCase() : finalCode;
    const res = await fetchData(normalizedSearchCode, currentSearchType, 1, currentPaidFilter, true);

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
      const preferred =
        preferredInvoiceId
          ? newData.find((item: any) => item?._id === preferredInvoiceId)
          : undefined;
      const exactInvoiceNumber = newData.find(
        (item: any) => item?.invoiceNumber?.toLowerCase() === normalizedSearchCode.toLowerCase()
      );
      const fallback = newData.find(
        (item: any) =>
          item?.invoiceNumber?.toLowerCase().includes(normalizedSearchCode.toLowerCase()) ||
          item?.customerName?.toLowerCase().includes(normalizedSearchCode.toLowerCase())
      );
      const targetInvoice = preferred || exactInvoiceNumber || fallback || newData[0];

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

      if (nextPage * 50 >= res.total) {
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
