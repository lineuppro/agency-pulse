import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users as UsersIcon, Mail, Loader2, RotateCw, Eye, EyeOff, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  client_id: string | null;
  client_name?: string | null;
  created_at: string;
  role?: string;
  gestor_clients?: { id: string; name: string }[];
}

export default function AdminUsers() {
  const { session, role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGestorClientsDialogOpen, setIsGestorClientsDialogOpen] = useState(false);
  const [selectedGestorUser, setSelectedGestorUser] = useState<UserProfile | null>(null);
  const [selectedGestorClientIds, setSelectedGestorClientIds] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    client_id: '',
    password: '',
    role: 'client' as string,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for all users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch gestor_clients assignments
      const { data: gestorClients } = await supabase
        .from('gestor_clients' as any)
        .select('user_id, client_id');

      const rolesMap = new Map<string, string>();
      (roles || []).forEach((r: any) => rolesMap.set(r.user_id, r.role));

      const gestorClientsMap = new Map<string, string[]>();
      (gestorClients || []).forEach((gc: any) => {
        const existing = gestorClientsMap.get(gc.user_id) || [];
        existing.push(gc.client_id);
        gestorClientsMap.set(gc.user_id, existing);
      });

      const usersWithClientNames = (profiles || []).map(profile => {
        const gestorClientIds = gestorClientsMap.get(profile.user_id) || [];
        const gestorClientsList = gestorClientIds
          .map(cid => {
            const client = clients?.find(c => c.id === cid);
            return client ? { id: client.id, name: client.name } : null;
          })
          .filter(Boolean) as { id: string; name: string }[];

        return {
          ...profile,
          client_name: clients?.find(c => c.id === profile.client_id)?.name || null,
          role: rolesMap.get(profile.user_id) || 'client',
          gestor_clients: gestorClientsList,
        };
      });

      setUsers(usersWithClientNames);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista de usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (email: string) => {
    if (!session?.access_token) return;
    setActionLoading(email);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email, action: 'resend' }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      toast({ title: 'Email enviado!', description: data.message });
    } catch (error) {
      toast({
        title: 'Erro ao enviar email',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!session?.access_token) return;
    setActionLoading(email);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email, action: 'delete' }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      toast({ title: 'Usuário excluído!', description: data.message });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (clients) {
      fetchUsers();
    }
  }, [clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user's profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name || null,
            client_id: formData.role === 'client' ? (formData.client_id || null) : null,
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        // Update role if changed
        if (formData.role !== editingUser.role) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: formData.role as any })
            .eq('user_id', editingUser.user_id);

          if (roleError) throw roleError;
        }

        toast({ title: 'Usuário atualizado com sucesso!' });
      } else {
        // Create new user via edge function
        if (!session?.access_token) throw new Error('Não autenticado');

        if (!formData.password || formData.password.length < 6) {
          toast({
            title: 'Senha inválida',
            description: 'A senha deve ter pelo menos 6 caracteres.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              clientId: formData.role === 'client' ? (formData.client_id || null) : null,
              email: formData.email,
              fullName: formData.full_name || null,
              password: formData.password,
              role: formData.role,
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar usuário');
        }
        toast({ title: data.message || 'Usuário criado com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingUser(null);
      setFormData({ email: '', full_name: '', client_id: '', password: '', role: 'client' });
      setShowPassword(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      client_id: user.client_id || '',
      password: '',
      role: user.role || 'client',
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingUser(null);
    setFormData({ email: '', full_name: '', client_id: '', password: '', role: 'client' });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleOpenGestorClients = (user: UserProfile) => {
    setSelectedGestorUser(user);
    setSelectedGestorClientIds(user.gestor_clients?.map(gc => gc.id) || []);
    setIsGestorClientsDialogOpen(true);
  };

  const handleSaveGestorClients = async () => {
    if (!selectedGestorUser) return;
    setSubmitting(true);

    try {
      // Delete all existing assignments
      const { error: deleteError } = await supabase
        .from('gestor_clients' as any)
        .delete()
        .eq('user_id', selectedGestorUser.user_id);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (selectedGestorClientIds.length > 0) {
        const inserts = selectedGestorClientIds.map(clientId => ({
          user_id: selectedGestorUser.user_id,
          client_id: clientId,
        }));

        const { error: insertError } = await supabase
          .from('gestor_clients' as any)
          .insert(inserts);

        if (insertError) throw insertError;
      }

      toast({ title: 'Clientes do gestor atualizados!' });
      setIsGestorClientsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving gestor clients:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGestorClient = (clientId: string) => {
    setSelectedGestorClientIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Admin</Badge>;
      case 'gestor':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Gestor</Badge>;
      case 'client':
        return <Badge variant="secondary">Cliente</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const filteredUsers = selectedClientFilter === 'all'
    ? users
    : selectedClientFilter === 'none'
    ? users.filter(u => !u.client_id && (!u.gestor_clients || u.gestor_clients.length === 0))
    : users.filter(u => 
        u.client_id === selectedClientFilter || 
        u.gestor_clients?.some(gc => gc.id === selectedClientFilter)
      );

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários e seus vínculos com empresas
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? 'Atualize as informações do usuário.'
                    : 'Crie um novo usuário com email e senha.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@empresa.com"
                    required
                    disabled={!!editingUser}
                  />
                  {editingUser && (
                    <p className="text-xs text-muted-foreground">
                      O email não pode ser alterado.
                    </p>
                  )}
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Defina a senha inicial. O usuário poderá alterá-la depois.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="João da Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Acesso</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="client">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.role === 'admin' && 'Acesso total ao sistema.'}
                    {formData.role === 'gestor' && 'Acesso aos clientes atribuídos pelo admin.'}
                    {formData.role === 'client' && 'Acesso ao portal da empresa vinculada.'}
                  </p>
                </div>
                {formData.role === 'client' && (
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Empresa Vinculada</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O usuário terá acesso ao portal da empresa selecionada.
                    </p>
                  </div>
                )}
                {formData.role === 'gestor' && editingUser && (
                  <p className="text-xs text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
                    💡 Após salvar, use o botão <Building2 className="inline h-3 w-3" /> no card do usuário para atribuir os clientes ao gestor.
                  </p>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      editingUser ? 'Salvar' : 'Criar'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Gestor Clients Dialog */}
      <Dialog open={isGestorClientsDialogOpen} onOpenChange={setIsGestorClientsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clientes do Gestor</DialogTitle>
            <DialogDescription>
              Selecione os clientes que <strong>{selectedGestorUser?.full_name || selectedGestorUser?.email}</strong> poderá gerenciar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {clients?.map((client) => (
              <label
                key={client.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedGestorClientIds.includes(client.id)}
                  onCheckedChange={() => toggleGestorClient(client.id)}
                />
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{client.name}</span>
                </div>
              </label>
            ))}
            {(!clients || clients.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente cadastrado.
              </p>
            )}
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-muted-foreground">
              {selectedGestorClientIds.length} cliente(s) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsGestorClientsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGestorClients} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-4">
        <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas empresas</SelectItem>
            <SelectItem value="none">Sem vínculo</SelectItem>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredUsers.length} usuário(s)
        </span>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/50">
              <CardHeader className="h-20 bg-muted/30" />
              <CardContent className="h-12 bg-muted/20" />
            </Card>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhum usuário encontrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedClientFilter === 'all' 
                ? 'Comece adicionando seu primeiro usuário.'
                : 'Nenhum usuário com este filtro.'}
            </p>
            {isAdmin && (
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Usuário
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {user.full_name || user.email.split('@')[0]}
                      </CardTitle>
                      <CardDescription className="text-xs truncate max-w-[180px]">
                        {user.email}
                      </CardDescription>
                    </div>
                  </div>
                  {getRoleBadge(user.role || 'client')}
                </div>
              </CardHeader>
              <CardContent>
                {user.role === 'client' && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Empresa:</span>
                    {user.client_name ? (
                      <Badge variant="secondary">{user.client_name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não vinculado</span>
                    )}
                  </div>
                )}
                {user.role === 'gestor' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Clientes:</span>
                      <span className="text-xs text-muted-foreground">
                        {user.gestor_clients?.length || 0} cliente(s)
                      </span>
                    </div>
                    {user.gestor_clients && user.gestor_clients.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.gestor_clients.map(gc => (
                          <Badge key={gc.id} variant="outline" className="text-xs">
                            {gc.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhum cliente atribuído</p>
                    )}
                  </div>
                )}
                {isAdmin && (
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(user)}
                            disabled={actionLoading === user.email}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {user.role === 'gestor' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenGestorClients(user)}
                              disabled={actionLoading === user.email}
                            >
                              <Building2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Gerenciar clientes</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleResendInvite(user.email)}
                            disabled={actionLoading === user.email}
                          >
                            {actionLoading === user.email ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCw className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reenviar senha</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <AlertDialog>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                disabled={actionLoading === user.email}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá remover permanentemente o usuário <strong>{user.email}</strong> e todos os seus dados. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteUser(user.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
