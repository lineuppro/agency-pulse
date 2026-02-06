import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SocialPlatform = "instagram" | "facebook" | "linkedin" | "tiktok" | "twitter";

export interface SocialConnection {
  id: string;
  client_id: string;
  platform: SocialPlatform;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  platform_user_id: string | null;
  platform_username: string | null;
  page_id: string | null;
  page_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageOption {
  id: string;
  name: string;
  accessToken: string;
  instagram: {
    id: string;
    username: string;
  } | null;
}

export function useSocialConnections(clientId: string | null) {
  const queryClient = useQueryClient();

  // Fetch connections for a client
  const { data: connections = [], isLoading, error } = useQuery({
    queryKey: ["social-connections", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from("social_connections")
        .select("*")
        .eq("client_id", clientId);

      if (error) throw error;
      return data as SocialConnection[];
    },
    enabled: !!clientId,
  });

  // Initialize OAuth flow
  const initOAuth = useMutation({
    mutationFn: async ({ clientId, redirectUrl }: { clientId: string; redirectUrl: string }) => {
      const { data, error } = await supabase.functions.invoke("social-auth", {
        body: { action: "init", clientId, redirectUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error("OAuth init error:", error);
      toast.error("Erro ao iniciar conexão: " + error.message);
    },
  });

  // Handle OAuth callback
  const handleCallback = useMutation({
    mutationFn: async ({ code, clientId, redirectUrl }: { code: string; clientId: string; redirectUrl: string }) => {
      const { data, error } = await supabase.functions.invoke("social-auth", {
        body: { action: "callback", code, clientId, redirectUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Conta conectada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["social-connections"] });
      }
    },
    onError: (error) => {
      console.error("OAuth callback error:", error);
      toast.error("Erro ao conectar conta: " + error.message);
    },
  });

  // Select a specific page
  const selectPage = useMutation({
    mutationFn: async (params: {
      clientId: string;
      accessToken: string;
      pageId: string;
      pageName: string;
      instagramAccountId?: string;
      instagramUsername?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("social-auth", {
        body: { action: "select-page", ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success("Página conectada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["social-connections"] });
    },
    onError: (error) => {
      console.error("Select page error:", error);
      toast.error("Erro ao selecionar página: " + error.message);
    },
  });

  // Disconnect a platform
  const disconnect = useMutation({
    mutationFn: async ({ clientId, platform }: { clientId: string; platform: string }) => {
      const { data, error } = await supabase.functions.invoke("social-auth", {
        body: { action: "disconnect", clientId, platform },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success("Conta desconectada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["social-connections"] });
    },
    onError: (error) => {
      console.error("Disconnect error:", error);
      toast.error("Erro ao desconectar: " + error.message);
    },
  });

  // Helper to check if a platform is connected
  const isConnected = (platform: SocialPlatform): boolean => {
    return connections?.some((c) => c.platform === platform) ?? false;
  };

  // Get connection for a specific platform
  const getConnection = (platform: SocialPlatform): SocialConnection | undefined => {
    return connections?.find((c) => c.platform === platform);
  };

  return {
    connections,
    isLoading,
    error,
    initOAuth,
    handleCallback,
    selectPage,
    disconnect,
    isConnected,
    getConnection,
  };
}
