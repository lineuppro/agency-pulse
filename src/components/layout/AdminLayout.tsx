import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { ClientProvider, useClientContext } from '@/contexts/ClientContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

function AdminHeader() {
  const { clients, selectedClientId, setSelectedClientId, isLoading } = useClientContext();

  return (
    <header className="h-14 border-b border-border flex items-center px-4 bg-card/50 gap-4">
      <SidebarTrigger className="mr-2" />
      <div className="flex items-center gap-2 ml-auto">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={isLoading}>
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}

export function AdminLayout() {
  return (
    <ClientProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 flex flex-col min-h-screen">
            <AdminHeader />
            <div className="flex-1 p-6 overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ClientProvider>
  );
}
