import { fetchAllColInvoiceByUser, fetchAllUncolInvoiceByUser } from '@/api/invoice.api';
import { InvoiceInfo } from '@/types/invoice';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

interface InvoiceContextType {
  uncollectedInvoices: InvoiceInfo[];
  collectedInvoices: InvoiceInfo[];
  loading: boolean;
  refetchInvoices: () => Promise<void>;
}

const InvoiceContext = createContext<InvoiceContextType | null>(null);

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (!context) throw new Error('useInvoices must be used within InvoiceProvider');
  return context;
}

interface Props {
  children: ReactNode;
}

export function InvoiceProvider({ children }: Props) {
  const [uncollectedInvoices, setUncollectedInvoices] = useState<InvoiceInfo[]>([]);
  const [collectedInvoices, setCollectedInvoices] = useState<InvoiceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const refetchInvoices = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const uncollectedRes = await fetchAllUncolInvoiceByUser();
      const collectedRes = await fetchAllColInvoiceByUser();
      
      setUncollectedInvoices(uncollectedRes?.data || []);
      setCollectedInvoices(collectedRes?.data || []);
    } catch (error) {
      console.error('Refetch invoices failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <InvoiceContext.Provider value={{
      uncollectedInvoices,
      collectedInvoices,
      loading,
      refetchInvoices
    }}>
      {children}
    </InvoiceContext.Provider>
  );
}

