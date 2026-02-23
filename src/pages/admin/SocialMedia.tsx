import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSocialConnections, PageOption } from "@/hooks/useSocialConnections";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Instagram, Facebook, Linkedin, Link2, Unlink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useClientContext } from "@/contexts/ClientContext";

export default function SocialMedia() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedClientId } = useClientContext();
  const clientId = selectedClientId !== 'all' ? selectedClientId : null;
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [pageSelectionModal, setPageSelectionModal] = useState<{ open: boolean; pages: PageOption[]; expiresIn: number }>({ open: false, pages: [], expiresIn: 0 });

  const { connections, isLoading: connectionsLoading, initOAuth, handleCallback, selectPage, disconnect, getConnection } = useSocialConnections(clientId);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && state && !isProcessingCallback) {
      setIsProcessingCallback(true);
      try {
        const decodedState = JSON.parse(atob(decodeURIComponent(state)));
        const { clientId: cbClientId, redirectUrl } = decodedState;
        setSearchParams({});
        handleCallback.mutate({ code, clientId: cbClientId, redirectUrl }, {
          onSuccess: (data) => { if (data.requiresSelection) setPageSelectionModal({ open: true, pages: data.pages, expiresIn: data.expiresIn }); setIsProcessingCallback(false); },
          onError: () => { setIsProcessingCallback(false); },
        });
      } catch (error) { console.error("Error processing OAuth callback:", error); toast.error("Erro ao processar autenticação"); setIsProcessingCallback(false); }
    }
  }, [searchParams]);

  const handleConnect = () => {
    if (!clientId) { toast.error("Selecione um cliente primeiro"); return; }
    initOAuth.mutate({ clientId, redirectUrl: window.location.origin + window.location.pathname });
  };

  const handleSelectPage = (page: PageOption) => {
    if (!clientId) return;
    selectPage.mutate({ clientId, accessToken: page.accessToken, pageId: page.id, pageName: page.name, instagramAccountId: page.instagram?.id, instagramUsername: page.instagram?.username }, { onSuccess: () => setPageSelectionModal({ open: false, pages: [], expiresIn: 0 }) });
  };

  const handleDisconnect = (platform: "instagram" | "facebook") => {
    if (!clientId) return;
    disconnect.mutate({ clientId, platform });
  };

  const facebookConnection = getConnection("facebook");
  const instagramConnection = getConnection("instagram");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Redes Sociais</h1>
        <p className="text-muted-foreground">Gerencie as conexões de mídias sociais dos seus clientes</p>
      </div>

      {clientId ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Instagram Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Instagram</CardTitle>
              <Instagram className="h-5 w-5 text-pink-500" />
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (<div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-full" /></div>) : instagramConnection ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><Badge variant="secondary">Conectado</Badge></div>
                  <p className="text-lg font-semibold">@{instagramConnection.platform_username}</p>
                  <p className="text-xs text-muted-foreground">Via página: {instagramConnection.page_name}</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleDisconnect("instagram")} disabled={disconnect.isPending}><Unlink className="mr-2 h-4 w-4" />Desconectar</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Não conectado</span></div>
                  <p className="text-xs text-muted-foreground">Conecte uma conta do Instagram Business via Facebook</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleConnect} disabled={initOAuth.isPending || isProcessingCallback}>
                    {initOAuth.isPending || isProcessingCallback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}Conectar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Facebook Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facebook</CardTitle>
              <Facebook className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (<div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-full" /></div>) : facebookConnection ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><Badge variant="secondary">Conectado</Badge></div>
                  <p className="text-lg font-semibold">{facebookConnection.page_name}</p>
                  <p className="text-xs text-muted-foreground">Página do Facebook</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleDisconnect("facebook")} disabled={disconnect.isPending}><Unlink className="mr-2 h-4 w-4" />Desconectar</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Não conectado</span></div>
                  <p className="text-xs text-muted-foreground">Conecte uma página do Facebook</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleConnect} disabled={initOAuth.isPending || isProcessingCallback}>
                    {initOAuth.isPending || isProcessingCallback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}Conectar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LinkedIn Card */}
          <Card className="opacity-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LinkedIn</CardTitle>
              <Linkedin className="h-5 w-5 text-blue-700" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3"><Badge variant="outline">Em breve</Badge><p className="text-xs text-muted-foreground">Integração com LinkedIn será disponibilizada em breve</p></div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="rounded-full bg-muted p-4 mb-4"><Link2 className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente selecionado</h3>
            <p className="text-muted-foreground text-center max-w-md">Use o seletor no topo da página para escolher um cliente.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={pageSelectionModal.open} onOpenChange={(open) => setPageSelectionModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Selecione uma Página</DialogTitle><DialogDescription>Escolha qual página deseja conectar.</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-4">
            {pageSelectionModal.pages.map((page) => (
              <button key={page.id} onClick={() => handleSelectPage(page)} disabled={selectPage.isPending} className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left disabled:opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><Facebook className="h-4 w-4 text-blue-600" /><span className="font-medium">{page.name}</span></div>
                    {page.instagram && <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><Instagram className="h-3 w-3 text-pink-500" /><span>@{page.instagram.username}</span></div>}
                  </div>
                  {selectPage.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
