import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Key, Globe } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configure as integrações e preferências do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Credenciais Google</CardTitle>
            </div>
            <CardDescription>
              Configure as credenciais para integração com Google Ads e Drive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As credenciais do Google serão configuradas via secrets do Supabase.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Integrações</CardTitle>
            </div>
            <CardDescription>
              Status das integrações ativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Google Ads API</span>
                <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning">
                  Pendente
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Google Drive API</span>
                <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning">
                  Pendente
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Lovable AI</span>
                <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                  Ativo
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
