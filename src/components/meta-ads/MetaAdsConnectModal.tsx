import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExternalLink, Trash2, Facebook, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useMetaAdsConnectionManager, useMetaTokenRefresh, type MetaAdsConnection } from '@/hooks/useMetaAdsMetrics';
import { Badge } from '@/components/ui/badge';

interface MetaAdsConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  existingConnection: MetaAdsConnection | null | undefined;
}

export function MetaAdsConnectModal({
  open,
  onOpenChange,
  clientId,
  existingConnection,
}: MetaAdsConnectModalProps) {
  const [accessToken, setAccessToken] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [adAccountName, setAdAccountName] = useState('');
  const [showDisconnectAlert, setShowDisconnectAlert] = useState(false);

  const { connectAccount, disconnectAccount } = useMetaAdsConnectionManager();
  const { refreshExpiring } = useMetaTokenRefresh();

  const getTokenStatus = () => {
    if (!existingConnection?.token_expires_at) return 'unknown';
    const expiresAt = new Date(existingConnection.token_expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return 'expired';
    if (daysLeft <= 7) return 'expiring';
    return 'valid';
  };

  const getTokenDaysLeft = () => {
    if (!existingConnection?.token_expires_at) return null;
    const expiresAt = new Date(existingConnection.token_expires_at);
    const now = new Date();
    return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const tokenStatus = existingConnection ? getTokenStatus() : null;
  const daysLeft = getTokenDaysLeft();

  const handleConnect = () => {
    if (!accessToken.trim() || !adAccountId.trim()) return;

    connectAccount.mutate(
      {
        clientId,
        accessToken: accessToken.trim(),
        adAccountId: adAccountId.trim(),
        adAccountName: adAccountName.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAccessToken('');
          setAdAccountId('');
          setAdAccountName('');
          onOpenChange(false);
        },
      }
    );
  };

  const handleDisconnect = () => {
    disconnectAccount.mutate(clientId, {
      onSuccess: () => {
        setShowDisconnectAlert(false);
        onOpenChange(false);
      },
    });
  };

  const isValid = accessToken.trim() && adAccountId.trim();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-[#1877F2]" />
              {existingConnection ? 'Gerenciar Conexão Meta Ads' : 'Conectar Meta Ads'}
            </DialogTitle>
            <DialogDescription>
              {existingConnection
                ? 'Atualize as credenciais ou desconecte a conta Meta Ads deste cliente.'
                : 'Vincule uma conta de anúncios do Meta (Facebook/Instagram Ads) a este cliente.'}
            </DialogDescription>
          </DialogHeader>

          {existingConnection && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Conta conectada:</p>
                {tokenStatus === 'valid' && (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Token válido ({daysLeft}d)
                  </Badge>
                )}
                {tokenStatus === 'expiring' && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Expira em {daysLeft}d
                  </Badge>
                )}
                {tokenStatus === 'expired' && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Token expirado
                  </Badge>
                )}
                {tokenStatus === 'unknown' && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Validade desconhecida
                  </Badge>
                )}
              </div>
              <p className="text-foreground">
                {existingConnection.ad_account_name || existingConnection.ad_account_id}
              </p>
              <p className="text-xs text-muted-foreground">
                ID: {existingConnection.ad_account_id}
              </p>
              {(tokenStatus === 'expiring' || tokenStatus === 'expired') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshExpiring.mutate()}
                  disabled={refreshExpiring.isPending}
                  className="w-full"
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${refreshExpiring.isPending ? 'animate-spin' : ''}`} />
                  {refreshExpiring.isPending ? 'Renovando...' : 'Renovar Token Automaticamente'}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ad-account-id">ID da Conta de Anúncios *</Label>
              <Input
                id="ad-account-id"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="Ex: 123456789012345 ou act_123456789012345"
              />
              <p className="text-xs text-muted-foreground">
                Encontre o ID em{' '}
                <a
                  href="https://business.facebook.com/settings/ad-accounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Meta Business Suite <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-token">Access Token *</Label>
              <Input
                id="access-token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Token de acesso da API"
              />
              <p className="text-xs text-muted-foreground">
                Gere um token com permissões de{' '}
                <code className="bg-muted px-1 rounded">ads_read</code> no{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Graph API Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-account-name">Nome da Conta (opcional)</Label>
              <Input
                id="ad-account-name"
                value={adAccountName}
                onChange={(e) => setAdAccountName(e.target.value)}
                placeholder="Ex: Minha Empresa - Principal"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {existingConnection && (
              <Button
                variant="destructive"
                onClick={() => setShowDisconnectAlert(true)}
                className="sm:mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConnect}
              disabled={!isValid || connectAccount.isPending}
            >
              {connectAccount.isPending ? 'Conectando...' : existingConnection ? 'Atualizar' : 'Conectar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDisconnectAlert} onOpenChange={setShowDisconnectAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Meta Ads?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá a conexão com a conta de anúncios deste cliente. 
              Você precisará reconectar para ver as métricas novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnectAccount.isPending ? 'Desconectando...' : 'Desconectar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
