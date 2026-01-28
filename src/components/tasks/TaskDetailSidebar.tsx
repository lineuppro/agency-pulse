import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Separator } from '@/components/ui/separator';
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
import {
  MessageSquare,
  Paperclip,
  History,
  Send,
  Upload,
  Trash2,
  Download,
  FileText,
  Image,
  File,
  Calendar,
  Tag,
  User,
  Building2,
} from 'lucide-react';
import { useTaskDetails } from '@/hooks/useTaskDetails';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskCategory = 'ads' | 'dev' | 'automation' | 'creative';

interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  due_date: string | null;
  assigned_to: string | null;
  meeting_agenda_id: string | null;
  created_at: string;
  archived_at?: string | null;
  clients?: { name: string } | null;
  meeting_agendas?: { title: string; meeting_date: string } | null;
}

interface TaskDetailSidebarProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (taskId: string) => Promise<void>;
  isAdmin: boolean;
  getUserName: (userId: string | null) => string | null;
}

const categoryLabels: Record<TaskCategory, string> = {
  ads: 'Anúncios',
  dev: 'Desenvolvimento',
  automation: 'Automação',
  creative: 'Criativo',
};

const categoryColors: Record<TaskCategory, string> = {
  ads: 'bg-blue-500/10 text-blue-500',
  dev: 'bg-green-500/10 text-green-500',
  automation: 'bg-purple-500/10 text-purple-500',
  creative: 'bg-orange-500/10 text-orange-500',
};

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
};

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600',
  in_progress: 'bg-blue-500/10 text-blue-600',
  completed: 'bg-green-500/10 text-green-600',
};

const actionLabels: Record<string, string> = {
  created: 'criou a tarefa',
  updated: 'atualizou a tarefa',
  status_changed: 'alterou o status',
  comment_added: 'adicionou um comentário',
  attachment_added: 'anexou um arquivo',
  attachment_removed: 'removeu um anexo',
  archived: 'arquivou a tarefa',
  unarchived: 'desarquivou a tarefa',
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return <File className="h-4 w-4" />;
  if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (fileType.includes('pdf') || fileType.includes('document'))
    return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function TaskDetailSidebar({
  task,
  open,
  onClose,
  onDelete,
  isAdmin,
  getUserName,
}: TaskDetailSidebarProps) {
  const [newComment, setNewComment] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    comments,
    attachments,
    activityLog,
    loading,
    addComment,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
  } = useTaskDetails(task?.id || null);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAttachment(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const url = await getAttachmentUrl(filePath);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col h-full overflow-hidden p-0">
        <SheetHeader className="shrink-0 p-6 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-foreground text-left">
                {task.title}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {task.clients?.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge className={categoryColors[task.category]}>
              <Tag className="h-3 w-3 mr-1" />
              {categoryLabels[task.category]}
            </Badge>
            <Badge className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
            {task.due_date && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
              </Badge>
            )}
          </div>

          {task.assigned_to && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <User className="h-3 w-3" />
              <span>Responsável: {getUserName(task.assigned_to)}</span>
            </div>
          )}

          {task.description && (
            <p className="text-sm text-muted-foreground mt-3 text-left">
              {task.description}
            </p>
          )}
        </SheetHeader>

        <Separator className="shrink-0" />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs defaultValue="comments" className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TabsList className="shrink-0 mx-6 mt-4 grid w-auto grid-cols-3">
              <TabsTrigger value="comments" className="gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Comentários</span>
                {comments.length > 0 && (
                  <span className="text-xs">({comments.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1">
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Anexos</span>
                {attachments.length > 0 && (
                  <span className="text-xs">({attachments.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0 px-6 data-[state=active]:flex">
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum comentário ainda
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-muted/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {comment.user_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "dd/MM/yy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="shrink-0 py-4 border-t bg-background">
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder="Escreva um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="resize-none flex-1 min-h-[60px]"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    size="icon"
                    className="shrink-0 h-10 w-10"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0 px-6 data-[state=active]:flex">
              <div className="flex-1 overflow-y-auto py-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse h-12 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum anexo ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 bg-muted/50 rounded-lg p-3"
                      >
                        {getFileIcon(attachment.file_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.user_name} •{' '}
                            {formatFileSize(attachment.file_size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleDownload(attachment.file_path, attachment.file_name)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                deleteAttachment(attachment.id, attachment.file_path)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 py-4 border-t bg-background">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Anexar arquivo
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0 px-6 data-[state=active]:flex">
              <div className="flex-1 overflow-y-auto py-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse h-10 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma atividade registrada
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activityLog.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <History className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p>
                            <span className="font-medium">{activity.user_name}</span>{' '}
                            <span className="text-muted-foreground">
                              {actionLabels[activity.action] || activity.action}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(activity.created_at),
                              "dd 'de' MMMM 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {isAdmin && onDelete && (
          <div className="shrink-0 p-6 pt-4 border-t bg-background">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Tarefa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A tarefa e todos os seus
                    comentários e anexos serão permanentemente removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
