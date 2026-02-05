import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MetaConnection {
  id: string;
  client_id: string;
  facebook_page_id: string | null;
  facebook_page_name: string | null;
  instagram_account_id: string | null;
  instagram_username: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageOption {
  id: string;
  name: string;
  access_token: string;
  instagram_account_id?: string;
  instagram_username?: string;
}

export function useMetaConnection(clientId: string | null) {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [availablePages, setAvailablePages] = useState<PageOption[] | null>(null);
  const [userAccessToken, setUserAccessToken] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConnection = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error('Error fetching meta connection:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnection();
  }, [clientId]);

  const getAuthUrl = async (redirectUri: string) => {
    if (!clientId) return null;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('meta-auth', {
        body: { action: 'get-auth-url', clientId, redirectUri },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data.authUrl;
    } catch (error: any) {
      console.error('Error getting auth URL:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao obter URL de autenticação',
        variant: 'destructive',
      });
      return null;
    }
  };

  const exchangeCode = async (code: string, redirectUri: string) => {
    if (!clientId) return { success: false, requiresSelection: false };
    
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('meta-auth', {
        body: { action: 'exchange-code', clientId, code, redirectUri },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      // Check if multiple pages available - requires selection
      if (data.requiresSelection && data.pages) {
        setAvailablePages(data.pages);
        setUserAccessToken(data.userAccessToken);
        return { success: false, requiresSelection: true };
      }

      if (data.success) {
        toast({
          title: 'Conectado!',
          description: `Conectado a ${data.connection.facebookPageName || 'Meta'}`,
        });
        await fetchConnection();
        return { success: true, requiresSelection: false };
      }

      throw new Error(data.error || 'Failed to connect');
    } catch (error: any) {
      console.error('Error exchanging code:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao conectar conta Meta',
        variant: 'destructive',
      });
      return { success: false, requiresSelection: false };
    } finally {
      setConnecting(false);
    }
  };

  const selectPage = async (pageId: string) => {
    if (!clientId || !userAccessToken) return false;
    
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('meta-auth', {
        body: { 
          action: 'select-page', 
          clientId, 
          selectedPageId: pageId,
          userAccessToken,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Conectado!',
          description: `Conectado a ${data.connection.facebookPageName || 'Meta'}`,
        });
        setAvailablePages(null);
        setUserAccessToken(null);
        await fetchConnection();
        return true;
      }

      throw new Error(data.error || 'Failed to connect');
    } catch (error: any) {
      console.error('Error selecting page:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao selecionar página',
        variant: 'destructive',
      });
      return false;
    } finally {
      setConnecting(false);
    }
  };

  const cancelSelection = () => {
    setAvailablePages(null);
    setUserAccessToken(null);
  };

  const disconnect = async () => {
    if (!clientId) return false;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('meta-auth', {
        body: { action: 'disconnect', clientId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Desconectado',
          description: 'Conta Meta desconectada com sucesso',
        });
        setConnection(null);
        return true;
      }

      throw new Error(data.error || 'Failed to disconnect');
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao desconectar',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    connection,
    loading,
    connecting,
    availablePages,
    getAuthUrl,
    exchangeCode,
    selectPage,
    cancelSelection,
    disconnect,
    refetch: fetchConnection,
  };
}
