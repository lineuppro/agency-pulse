import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  name: string;
  google_ads_id?: string | null;
  google_drive_id?: string | null;
  website_url?: string | null;
}

interface ClientContextType {
  clients: Client[];
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  selectedClient: Client | undefined;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['global-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, google_ads_id, google_drive_id, website_url')
        .order('name');
      if (error) throw error;
      return data as Client[];
    },
  });

  const selectedClient = selectedClientId !== 'all' 
    ? clients.find(c => c.id === selectedClientId) 
    : undefined;

  return (
    <ClientContext.Provider value={{
      clients,
      selectedClientId,
      setSelectedClientId,
      selectedClient,
      isLoading,
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
}
