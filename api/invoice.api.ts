// frontend/services/api.ts
import { api } from "@/context/AuthContext";
import { FetchInvoiceResponse, InvoiceInfo } from "@/types/invoice";

const handleApiError = (error: any, defaultMessage: string): never => {
  if (error.response) {
    const message = error.response.data?.message || defaultMessage;
    throw new Error(message);
  } else if (error.request) {
    throw new Error("Không thể kết nối server. Vui lòng kiểm tra kết nối mạng");
  } else {
    console.error("API Error:", error);
    throw new Error(defaultMessage);
  }
};

export const fetchallInvoice = async (
  currentPage: number,
  invoicesPerPage: number,
  printStatus?: "printed" | "not_printed",
  collectionStatus?: "collected" | "not_collected",
  assignedUserId?: string,
  province?: string,
  searchInvoiceNumber?: string,
  userprovince?: string,
  collectionDate?: string
) => {
  try {
    const res = await api.get<FetchInvoiceResponse>(`/api/invoices/fetchall`, {
      params: {
        currentPage,
        invoicesPerPage,
        printStatus,
        collectionStatus,
        assignedUserId,
        province,
        searchInvoiceNumber,
        userprovince,
        collectionDate,
      },
    });
    return res;
  } catch (error) {
    handleApiError(error, "Lỗi khi tải danh sách hóa đơn");
  }
};

export const searchInvoice_API = async (
  collectionStatus?: "collected" | "not_collected" | "all",
  assignedUserId?: string,
  userprovince?: string,
  searchInvoiceNumber?: string,
  searchType?: string,
  page?: number,
  limit?: number,
  isPaid?: boolean | string
) => {
  try {
    const res = await api.get(`/api/invoices/search`, {
      params: {
        collectionStatus,
        assignedUserId,
        userprovince,
        searchInvoiceNumber,
        searchType,
        page,
        limit,
        isPaid,
      },
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "Lỗi khi tìm kiếm hóa đơn");
  }
};

export const searchInvoiceByStationCode_API = async (
  stationCode: string,
  page?: number,
  limit?: number
) => {
  try {
    const res = await api.get(`/api/invoices/search-by-station`, {
      params: {
        stationCode,
        page,
        limit,
      },
    });
    return res.data;
  } catch (error: any) {
    console.error("=== LỖI TÌM KIẾM MÃ TRẠM ===");
    console.error("Status:", error.response?.status);
    console.error("Message:", error.response?.data?.message);
    console.error("Full error:", error.response?.data);
    
    if (error.response?.status === 401) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
    
    const responseData = error.response?.data;
    const isHtmlError = typeof responseData === 'string' && 
      (responseData.includes('Cannot GET') || 
       responseData.includes('<!DOCTYPE html>') ||
       responseData.includes('<html'));
    
    if (isHtmlError) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
      throw new Error("Lỗi kết nối server. Vui lòng thử lại sau.");
    }
    
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy dữ liệu với mã trạm này.");
    } else if (error.response?.status === 500) {
      throw new Error("Lỗi server. Vui lòng thử lại sau.");
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.request) {
      throw new Error("Không thể kết nối server. Vui lòng kiểm tra kết nối mạng.");
    } else {
      throw new Error("Lỗi khi tìm kiếm theo trạm: " + error.message);
    }
  }
};

export const searchInvoiceByDate_API = async (
  assignedUserId: string,
  userprovince: string,
  selectedDate: string,
  page?: number,
  limit?: number
) => {
  try {
    const res = await api.get(`/api/invoices/searchByDate`, {
      params: {
        assignedUserId,
        userprovince,
        selectedDate,
        page,
        limit,
      },
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "Lỗi khi tìm kiếm theo ngày");
  }
};

export const fetchInvoiceByUser = async () => {
  try {
    const res = await api.get<InvoiceInfo[]>(`/api/invoices/fetchallbyuser`);
    return res;
  } catch (error) {
    handleApiError(error, "Lỗi khi lấy thông tin hóa đơn");
  }
};

export const fetchAllUncolInvoiceByUser = async () => {
  try {
    const res = await api.get<InvoiceInfo[]>(`/api/invoices/fetchalluncolbyuser`);
    return res;
  } catch (error) {
    handleApiError(error, "Lỗi khi lấy danh sách hóa đơn chưa thu");
  }
};

export const fetchAllColInvoiceByUser = async () => {
  try {
    const res = await api.get<InvoiceInfo[]>(`/api/invoices/fetchallcolbyuser`);
    return res;
  } catch (error) {
    handleApiError(error, "Lỗi khi lấy danh sách hóa đơn đã thu");
  }
};

export const handleToggle_API = async (invoiceId: string, field: "printStatus" | "collectionStatus") => {
  try {
    const res = await api.patch(`/api/invoices/${invoiceId}/toggle`, { field });
    return res;
  } catch (error) {
    handleApiError(error, "Cập nhật trạng thái thất bại");
  }
};

export const handleToggleIsPaid_API = async (invoiceId: string) => {
  try {
    const res = await api.patch(`/api/invoices/${invoiceId}/toggleispaid`, {});
    return res;
  } catch (error) {
    handleApiError(error, "Cập nhật trạng thái đóng cước thất bại");
  }
};

export const fetch20InvoiceLargest = async (collectionStatus: string) => {
  try {
    const res = await api.get(`/api/invoices/largest`, {
      params: {
        collectionStatus,
      },
    });
    return res;
  } catch (error) {
    handleApiError(error, "Lấy thông tin hóa đơn thất bại");
  }
};

export const fetchTop3Stations = async (collectionStatus: string) => {
  try {
    const res = await api.get(`/api/invoices/top3stations`, {
      params: {
        collectionStatus,
      },
    });
    return res;
  } catch (error) {
    handleApiError(error, "Lấy thông tin trạm thất bại");
  }
};

export const updateInvoice = async (invoiceId: string, formData: any) => {
  try {
    // Backend contract: PUT /api/invoices/update/:invoiceId and body { formData }
    const res = await api.put(`/api/invoices/update/${invoiceId}`, { formData });
    return res.data;
  } catch (error: any) {
    console.error("Update invoice error:", error.response?.data || error);
    handleApiError(error, "Cập nhật thông tin thất bại");
  }
};

export const quickAddInvoice = async (invoiceData: {
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  recordBookCode?: string;
  billing_period?: string;
  currentAmount?: number;
  previousAmount?: number;
}) => {
  try {
    const res = await api.post(`/api/invoices/quick-add`, {
      invoiceNumber: invoiceData.invoiceNumber,
      customerName: invoiceData.customerName,
      totalAmount: invoiceData.totalAmount,
      ...(invoiceData.recordBookCode ? { recordBookCode: invoiceData.recordBookCode } : {}),
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "Thêm hóa đơn thất bại");
  }
};

// --- API mới: Lấy tất cả hóa đơn đã đóng cước ---
// Khi gọi API này:
// - Admin: KHÔNG truyền assignedUserId (xem tất cả)
// - User: Truyền assignedUserId (xem của mình)
export const fetchAllPaidInvoices_API = async (
  assignedUserId?: string,
  userprovince?: string,
  page?: number,
  limit?: number
) => {
  try {
    const res = await api.get(`/api/invoices/search`, {
      params: {
        collectionStatus: "not_collected",
        assignedUserId, // Nếu không truyền = admin xem tất cả
        userprovince,
        isPaid: "true", // Lọc hóa đơn đã đóng cước
        page: page || 1,
        limit: limit || 50,
      },
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "Lỗi khi lấy danh sách hóa đơn đã đóng cước");
  }
};

