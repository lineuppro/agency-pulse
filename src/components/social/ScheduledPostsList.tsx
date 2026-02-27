import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Instagram,
  Facebook,
  Calendar,
  Clock,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useScheduledPosts, type ScheduledPost } from '@/hooks/useScheduledPosts';
import type { Database } from '@/integrations/supabase/types';

type SocialPlatform = Database['public']['Enums']['social_platform'];
type SocialPostStatus = Database['public']['Enums']['social_post_status'];

interface ScheduledPostsListProps {
  editorialContentId?: string;
  clientId?: string;
}

const statusConfig: Record<SocialPostStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: Clock },
  scheduled: { label: 'Agendado', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30', icon: Calendar },
  publishing: { label: 'Publicando', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30', icon: Loader2 },
  published: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: Trash2 },
};

const platformConfig: Record<SocialPlatform, { icon: typeof Instagram; color: string }> = {
  instagram: { icon: Instagram, color: 'text-pink-600' },
  facebook: { icon: Facebook, color: 'text-blue-600' },
  linkedin: { icon: Instagram, color: 'text-blue-800' },
  tiktok: { icon: Instagram, color: 'text-black' },
  twitter: { icon: Instagram, color: 'text-sky-500' },
};

export function ScheduledPostsList({ editorialContentId, clientId }: ScheduledPostsListProps) {
  const { scheduledPosts, isLoading, deleteScheduledPost, hardDeleteScheduledPost, publishNow } = useScheduledPosts(
    editorialContentId,
    clientId
  );

  // Filter out cancelled posts and show only active ones
  const activePosts = scheduledPosts.filter((post) => post.status !== 'cancelled');

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activePosts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum agendamento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Agendamentos ({activePosts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activePosts.map((post) => {
          const platform = platformConfig[post.platform] || platformConfig.instagram;
          const status = statusConfig[post.status];
          const PlatformIcon = platform.icon;
          const StatusIcon = status.icon;

          return (
            <div
              key={post.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg bg-muted')}>
                  <PlatformIcon className={cn('h-5 w-5', platform.color)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{post.platform}</span>
                    <Badge className={cn('text-xs', status.color)}>
                      <StatusIcon className={cn('h-3 w-3 mr-1', post.status === 'publishing' && 'animate-spin')} />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(post.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    {post.media_urls.length > 0 && (
                      <>
                        <span>•</span>
                        <ImageIcon className="h-3 w-3" />
                        {post.media_urls.length} mídia(s)
                      </>
                    )}
                  </div>
                  {post.error_message && (
                    <p className="text-xs text-destructive mt-1">{post.error_message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {post.status === 'scheduled' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => publishNow.mutate(post.id)}
                      disabled={publishNow.isPending}
                    >
                      {publishNow.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Cancelar agendamento">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>O que deseja fazer?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Escolha entre cancelar o agendamento (mantém o registro) ou excluir permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteScheduledPost.mutate(post.id)}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                          >
                            Cancelar Agendamento
                          </AlertDialogAction>
                          <AlertDialogAction
                            onClick={() => hardDeleteScheduledPost.mutate(post.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir Permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {post.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => publishNow.mutate(post.id)}
                    disabled={publishNow.isPending}
                  >
                    {publishNow.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Tentar novamente
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
