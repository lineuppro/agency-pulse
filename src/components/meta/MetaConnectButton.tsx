import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Facebook, Instagram, Link, Unlink, Loader2 } from 'lucide-react';
import { useMetaConnection } from '@/hooks/useMetaConnection';

interface MetaConnectButtonProps {
  clientId: string;
}

export function MetaConnectButton({ clientId }: MetaConnectButtonProps) {
  const { connection, loading, connecting, getAuthUrl, exchangeCode, disconnect } = useMetaConnection(clientId);
  const [isConnecting, setIsConnecting] = useState(false);

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
          exchangeCode(code, redirectUri).then(() => {
            // Clean up URL
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

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Carregando...
      </Button>
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
