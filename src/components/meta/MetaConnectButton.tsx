import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Facebook, Instagram, Link, Unlink, Loader2 } from 'lucide-react';
import { useMetaConnection, PageOption } from '@/hooks/useMetaConnection';

interface MetaConnectButtonProps {
  clientId: string;
}

export function MetaConnectButton({ clientId }: MetaConnectButtonProps) {
  const { 
    connection, 
    loading, 
    connecting, 
    availablePages,
    getAuthUrl, 
    exchangeCode, 
    selectPage,
    cancelSelection,
    disconnect 
  } = useMetaConnection(clientId);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectingPage, setSelectingPage] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      try {
        const parsedState = JSON.parse(decodeURIComponent(state));
        if (parsedState.clientId === clientId) {
          const redirectUri = `${window.location.origin}${window.location.pathname}`;
          exchangeCode(code, redirectUri).then((result) => {
            // Clean up URL regardless of result
            window.history.replaceState({}, document.title, window.location.pathname);
          });
        }
      } catch (e) {
        console.error('Failed to parse state:', e);
      }
    }
  }, [clientId]);

  const handleConnect = async () => {
    setIsConnecting(true);
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const authUrl = await getAuthUrl(redirectUri);
    
    if (authUrl) {
      window.location.href = authUrl;
    }
    setIsConnecting(false);
  };

  const handleSelectPage = async (page: PageOption) => {
    setSelectingPage(page.id);
    await selectPage(page.id);
    setSelectingPage(null);
  };

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Carregando...
      </Button>
    );
  }

  // Show page selection dialog
  if (availablePages && availablePages.length > 0) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && cancelSelection()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione a Página</DialogTitle>
            <DialogDescription>
              Você tem acesso a múltiplas páginas. Selecione qual deseja conectar a este cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {availablePages.map((page) => (
              <Button
                key={page.id}
                variant="outline"
                className="w-full justify-start h-auto py-3"
                disabled={connecting}
                onClick={() => handleSelectPage(page)}
              >
                {selectingPage === page.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Facebook className="h-4 w-4 mr-2 text-primary" />
                )}
                <div className="text-left">
                  <div className="font-medium">{page.name}</div>
                  {page.instagram_username && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Instagram className="h-3 w-3" />
                      @{page.instagram_username}
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={cancelSelection} disabled={connecting}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (connection) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {connection.facebook_page_name && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Facebook className="h-3 w-3" />
              {connection.facebook_page_name}
            </Badge>
          )}
          {connection.instagram_username && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Instagram className="h-3 w-3" />
              @{connection.instagram_username}
            </Badge>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Unlink className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar conta Meta?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso irá remover a conexão com Facebook e Instagram. Os posts agendados não serão publicados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={disconnect}>
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isConnecting || connecting}>
      {isConnecting || connecting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Link className="h-4 w-4 mr-2" />
      )}
      Conectar Meta
    </Button>
  );
}
