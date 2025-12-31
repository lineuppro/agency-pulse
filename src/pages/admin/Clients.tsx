import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  google_ads_id: string | null;
  google_drive_id: string | null;
  created_at: string;
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    google_ads_id: '',
    google_drive_id: '',
  });
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a lista de clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            logo_url: formData.logo_url || null,
            google_ads_id: formData.google_ads_id || null,
            google_drive_id: formData.google_drive_id || null,
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({ title: 'Cliente atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({
            name: formData.name,
            logo_url: formData.logo_url || null,
            google_ads_id: formData.google_ads_id || null,
            google_drive_id: formData.google_drive_id || null,
          });

        if (error) throw error;
        toast({ title: 'Cliente criado com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingClient(null);
      setFormData({ name: '', logo_url: '', google_ads_id: '', google_drive_id: '' });
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Erro ao salvar cliente',
        description: 'Não foi possível salvar o cliente.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      logo_url: client.logo_url || '',
      google_ads_id: client.google_ads_id || '',
      google_drive_id: client.google_drive_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Cliente removido com sucesso!' });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro ao remover cliente',
        description: 'Não foi possível remover o cliente.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = () => {
    setEditingClient(null);
    setFormData({ name: '', logo_url: '', google_ads_id: '', google_drive_id: '' });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os clientes da sua agência
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient 
                  ? 'Atualize as informações do cliente.' 
                  : 'Preencha as informações do novo cliente.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cliente *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Empresa ABC"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logo</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google_ads_id">Google Ads Customer ID</Label>
                <Input
                  id="google_ads_id"
                  value={formData.google_ads_id}
                  onChange={(e) => setFormData({ ...formData, google_ads_id: e.target.value })}
                  placeholder="Ex: 123-456-7890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google_drive_id">Google Drive Folder ID</Label>
                <Input
                  id="google_drive_id"
                  value={formData.google_drive_id}
                  onChange={(e) => setFormData({ ...formData, google_drive_id: e.target.value })}
                  placeholder="Ex: 1AbCdEfGhIjKlMnOpQrStUvWxYz"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingClient ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/50">
              <CardHeader className="h-24 bg-muted/30" />
              <CardContent className="h-16 bg-muted/20" />
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhum cliente cadastrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece adicionando seu primeiro cliente.
            </p>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img 
                        src={client.logo_url} 
                        alt={client.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription>
                        Criado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Google Ads:</span>
                    <span className="font-mono text-foreground">
                      {client.google_ads_id || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Google Drive:</span>
                    <span className="font-mono text-foreground truncate max-w-[120px]">
                      {client.google_drive_id || '-'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(client)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Todos os dados associados a este cliente serão removidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(client.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
