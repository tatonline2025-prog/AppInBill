export interface InvoiceInfo {
  _id: string;
  billing_period: string;
  collectionStatus: string;
  customerAddress: string;
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  printStatus: string;
  totalAmount: number;
  issueDate: string;
  collectionDate: string | null;
  currentAmount: number | null;
  previousAmount: number | null;
  recordBookCode: string | null;
  assignedTo: {
    email: string;
    fullName: string;
    phone: string;
    collectionFee: number;
    _id: string;
  };

  readingSession: string | null;
  meterNumber: string | null;
  consumption: string | null;
  isPaid: boolean;
}

export interface FetchInvoiceResponse {
  success: boolean;
  data: InvoiceInfo[];
  summary: {
    totalInvoices: number;
    totalAmount: number;
    unassignedInvoices: number;
  };
  pagination: {
    total: number;
    lastId: number;
    currentPage: number;
    invoicesPerPage: number;
    totalPages: number;
  };
}

export interface SearchInvoiceResponse {
  success: boolean;
  data: InvoiceInfo[];
  count: number;
}
