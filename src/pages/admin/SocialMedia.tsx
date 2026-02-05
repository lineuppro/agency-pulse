import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Instagram, Facebook, Clock, CheckCircle, XCircle, 
  Loader2, Trash2, Send, Calendar as CalendarIcon, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useScheduledPosts, ScheduledPost } from '@/hooks/useScheduledPosts';
import { MetaConnectButton } from '@/components/meta/MetaConnectButton';
import { SchedulePostModal } from '@/components/meta/SchedulePostModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'scheduled':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Agendado</Badge>;
    case 'publishing':
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Publicando</Badge>;
    case 'published':
      return <Badge className="bg-success/20 text-success border-success/30 gap-1"><CheckCircle className="h-3 w-3" /> Publicado</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Falhou</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'instagram':
      return <Instagram className="h-4 w-4 text-primary" />;
    case 'facebook':
      return <Facebook className="h-4 w-4 text-primary" />;
    case 'both':
      return (
        <div className="flex gap-1">
          <Instagram className="h-4 w-4 text-primary" />
          <Facebook className="h-4 w-4 text-primary" />
        </div>
      );
    default:
      return null;
  }
};

export default function SocialMedia() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const { toast } = useToast();

  const { connection, loading: connectionLoading, refetch: refetchConnection } = useMetaConnection(selectedClientId);
  const { posts, loading: postsLoading, deletePost, publishNow, refetch } = useScheduledPosts(selectedClientId);

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar clientes',
          variant: 'destructive',
        });
        return;
      }

      setClients(data || []);
      setLoadingClients(false);
      
      if (data && data.length > 0) {
        setSelectedClientId(data[0].id);
      }
    }

    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      refetchConnection();
    }
  }, [selectedClientId]);

  const handleDeletePost = async (postId: string) => {
    if (confirm('Tem certeza que deseja excluir este post agendado?')) {
      await deletePost(postId);
    }
  };

  const handlePublishNow = async (postId: string) => {
    if (confirm('Deseja publicar este post agora?')) {
      await publishNow(postId);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const scheduledPosts = posts.filter(p => p.status === 'scheduled');
  const publishedPosts = posts.filter(p => p.status === 'published');
  const failedPosts = posts.filter(p => p.status === 'failed');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Social Media</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie conexões e posts agendados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select 
            value={selectedClientId} 
            onValueChange={setSelectedClientId}
            disabled={loadingClients}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchConnection();
              refetch();
            }}
            disabled={!selectedClientId}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {!selectedClientId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Instagram className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Selecione um cliente
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              Escolha um cliente para gerenciar suas redes sociais
            </p>
          </CardContent>
        </Card>
      )}

      {selectedClientId && (
        <>
          {/* Meta Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="flex gap-1">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  <Facebook className="h-5 w-5 text-blue-600" />
                </div>
                Conexão Meta
              </CardTitle>
              <CardDescription>
                Conecte a conta do Instagram e Facebook para publicação automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando conexão...
                </div>
              ) : connection ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-success" />
                    <div>
                      <p className="font-medium text-foreground">Conectado</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {connection.instagram_username && (
                          <span className="flex items-center gap-1">
                            <Instagram className="h-3 w-3" />
                            @{connection.instagram_username}
                          </span>
                        )}
                        {connection.facebook_page_name && (
                          <span className="flex items-center gap-1">
                            <Facebook className="h-3 w-3" />
                            {connection.facebook_page_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Agendar Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Conecte a conta Meta do cliente para habilitar publicação automática.
                  </p>
                  <MetaConnectButton 
                    clientId={selectedClientId} 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Posts */}
          {connection && (
            <Tabs defaultValue="scheduled" className="space-y-4">
              <TabsList>
                <TabsTrigger value="scheduled" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Agendados ({scheduledPosts.length})
                </TabsTrigger>
                <TabsTrigger value="published" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Publicados ({publishedPosts.length})
                </TabsTrigger>
                <TabsTrigger value="failed" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Falhos ({failedPosts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scheduled">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Posts Agendados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {postsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : scheduledPosts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plataforma</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Legenda</TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scheduledPosts.map((post) => (
                            <TableRow key={post.id}>
                              <TableCell>{getPlatformIcon(post.platform)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{post.post_type}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {post.caption || '-'}
                              </TableCell>
                              <TableCell>
                                {format(new Date(post.scheduled_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell>{getStatusBadge(post.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handlePublishNow(post.id)}
                                    title="Publicar agora"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePost(post.id)}
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum post agendado</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setIsScheduleModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agendar primeiro post
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="published">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Posts Publicados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {publishedPosts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plataforma</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Legenda</TableHead>
                            <TableHead>Publicado em</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {publishedPosts.map((post) => (
                            <TableRow key={post.id}>
                              <TableCell>{getPlatformIcon(post.platform)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{post.post_type}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {post.caption || '-'}
                              </TableCell>
                              <TableCell>
                                {post.published_at 
                                  ? format(new Date(post.published_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                                  : '-'
                                }
                              </TableCell>
                              <TableCell>{getStatusBadge(post.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum post publicado ainda</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="failed">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Posts com Falha</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {failedPosts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plataforma</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Legenda</TableHead>
                            <TableHead>Erro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {failedPosts.map((post) => (
                            <TableRow key={post.id}>
                              <TableCell>{getPlatformIcon(post.platform)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{post.post_type}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">
                                {post.caption || '-'}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-destructive">
                                {post.error_message || 'Erro desconhecido'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePost(post.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum post com falha</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {/* Schedule Modal */}
      <SchedulePostModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        clientId={selectedClientId}
      />
    </div>
  );
}
