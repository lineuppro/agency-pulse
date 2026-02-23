import { useState, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
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
  ThumbsUp,
  Heart,
  PartyPopper,
  CircleHelp,
  Reply,
  ChevronDown,
  ChevronRight,
  Smile,
  Paperclip,
  Pencil,
  Check,
  X,
  Save,
} from 'lucide-react';
import { useTaskDetailsV2, TaskComment, ReactionType } from '@/hooks/useTaskDetailsV2';
import { cn } from '@/lib/utils';

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

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string;
  client_id: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface TaskDetailSidebarProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (taskId: string) => Promise<void>;
  onUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  isAdmin: boolean;
  getUserName: (userId: string | null) => string | null;
  users?: UserProfile[];
  clients?: ClientOption[];
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

const reactionIcons: Record<ReactionType, React.ReactNode> = {
  like: <ThumbsUp className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  celebrate: <PartyPopper className="h-4 w-4" />,
  thinking: <CircleHelp className="h-4 w-4" />,
};

const reactionLabels: Record<ReactionType, string> = {
  like: 'Curtir',
  heart: 'Amei',
  celebrate: 'Celebrar',
  thinking: 'Pensando',
};

const actionLabels: Record<string, string> = {
  created: 'criou a tarefa',
  updated: 'atualizou a tarefa',
  status_changed: 'alterou o status',
  comment_added: 'comentou',
  reply_added: 'respondeu um comentário',
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function CommentItem({
  comment,
  onReply,
  onToggleReaction,
  onEditComment,
  currentUserId,
  isReply = false,
}: {
  comment: TaskComment;
  onReply: (commentId: string) => void;
  onToggleReaction: (commentId: string, type: ReactionType) => void;
  onEditComment: (commentId: string, content: string) => void;
  currentUserId?: string;
  isReply?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const reactionCounts = comment.reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<ReactionType, number>);

  const userReactions = new Set(
    comment.reactions
      .filter(r => r.user_id === currentUserId)
      .map(r => r.reaction_type)
  );

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: false,
    locale: ptBR,
  });

  const isOwner = currentUserId === comment.user_id;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEditComment(comment.id, editContent);
    }
    setIsEditing(false);
  };

  return (
    <div className={cn("group", isReply && "ml-8 border-l-2 border-muted pl-4")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(comment.user_name || 'U')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">
              {comment.user_name}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          {isEditing ? (
            <div className="bg-muted/50 rounded-lg p-3 mb-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="resize-none min-h-[60px] text-sm"
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditContent(comment.content); }}>
                  <X className="h-3 w-3 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim()}>
                  <Check className="h-3 w-3 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 mb-2 group/comment relative">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {comment.content}
              </p>
              {isOwner && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Reactions and actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Existing reactions */}
            {Object.entries(reactionCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => onToggleReaction(comment.id, type as ReactionType)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                  userReactions.has(type as ReactionType)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {reactionIcons[type as ReactionType]}
                <span>{count}</span>
              </button>
            ))}

            {/* Add reaction */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted hover:bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Smile className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1">
                  {(Object.keys(reactionIcons) as ReactionType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => onToggleReaction(comment.id, type)}
                      className={cn(
                        "p-2 rounded-md hover:bg-muted transition-colors",
                        userReactions.has(type) && "bg-primary/10"
                      )}
                      title={reactionLabels[type]}
                    >
                      {reactionIcons[type]}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Reply button */}
            {!isReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Reply className="h-3.5 w-3.5" />
                <span>Responder</span>
              </button>
            )}
          </div>

          {/* Replies */}
          {comment.replies.length > 0 && !isReply && (
            <Collapsible open={showReplies} onOpenChange={setShowReplies} className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                {showReplies ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                <span>
                  {comment.replies.length} {comment.replies.length === 1 ? 'resposta' : 'respostas'}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                {comment.replies.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onReply={onReply}
                    onToggleReaction={onToggleReaction}
                    onEditComment={onEditComment}
                    currentUserId={currentUserId}
                    isReply
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskDetailSidebar({
  task,
  open,
  onClose,
  onDelete,
  onUpdate,
  isAdmin,
  getUserName,
  users = [],
  clients = [],
}: TaskDetailSidebarProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSection, setActiveSection] = useState<'comments' | 'attachments'>('comments');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    category: '' as TaskCategory,
    status: '' as TaskStatus,
    due_date: '',
    assigned_to: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    comments,
    attachments,
    activityLog,
    loading,
    addComment,
    updateComment,
    toggleReaction,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    currentUserId,
  } = useTaskDetailsV2(task?.id || null);

  const startEditing = () => {
    if (!task) return;
    setEditData({
      title: task.title,
      description: task.description || '',
      category: task.category,
      status: task.status,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEditing = async () => {
    if (!task || !onUpdate) return;
    await onUpdate(task.id, {
      title: editData.title,
      description: editData.description || null,
      category: editData.category,
      status: editData.status,
      due_date: editData.due_date || null,
      assigned_to: editData.assigned_to || null,
    });
    setIsEditing(false);
  };

  const getAvailableUsers = () => {
    if (!task) return users;
    return users.filter((u) => u.client_id === task.client_id || !u.client_id);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment, replyingTo || undefined);
    setNewComment('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    textareaRef.current?.focus();
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

  const handleDownload = async (filePath: string) => {
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

  const replyingToComment = replyingTo
    ? comments.find(c => c.id === replyingTo)
    : null;

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setIsEditing(false); } onClose(); }}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col h-[100dvh] overflow-hidden p-0">
        {/* Header */}
        <SheetHeader className="shrink-0 p-6 pb-4 border-b">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v as TaskCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v as TaskStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data de Entrega</Label>
                  <Input type="date" value={editData.due_date} onChange={(e) => setEditData({ ...editData, due_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Select value={editData.assigned_to || 'none'} onValueChange={(v) => setEditData({ ...editData, assigned_to: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {getAvailableUsers().map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email.split('@')[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-3 w-3 mr-1" />Cancelar</Button>
                <Button size="sm" onClick={saveEditing} disabled={!editData.title.trim()}><Save className="h-3 w-3 mr-1" />Salvar</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg font-semibold text-foreground text-left">
                    {task.title}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {task.clients?.name}
                  </p>
                </div>
                {onUpdate && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={startEditing}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
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
                  <User className="h-3.5 w-3.5" />
                  <span>Responsável: {getUserName(task.assigned_to)}</span>
                </div>
              )}

              {task.description && (
                <p className="text-sm text-muted-foreground mt-3 text-left">
                  {task.description}
                </p>
              )}
            </>
          )}
        </SheetHeader>

        {/* Activity Timeline */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Section Toggle */}
            <div className="flex items-center gap-4 border-b pb-4">
              <button
                onClick={() => setActiveSection('comments')}
                className={cn(
                  "flex items-center gap-2 pb-2 text-sm font-medium border-b-2 -mb-[17px] transition-colors",
                  activeSection === 'comments'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Comentários
                {comments.length > 0 && (
                  <span className="bg-muted px-1.5 py-0.5 rounded-full text-xs">
                    {comments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveSection('attachments')}
                className={cn(
                  "flex items-center gap-2 pb-2 text-sm font-medium border-b-2 -mb-[17px] transition-colors",
                  activeSection === 'attachments'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Paperclip className="h-4 w-4" />
                Anexos
                {attachments.length > 0 && (
                  <span className="bg-muted px-1.5 py-0.5 rounded-full text-xs">
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>

            {activeSection === 'comments' && (
              <>
                {/* Activity Log */}
                {activityLog.length > 0 && (
                  <div className="space-y-3">
                    {activityLog.slice(0, 5).map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {getInitials(activity.user_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {activity.user_name}
                            </span>{' '}
                            {actionLabels[activity.action] || activity.action}
                            <span className="ml-2 text-xs">
                              {formatDistanceToNow(new Date(activity.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Comments */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <div key={i} className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                            <div className="h-16 bg-muted animate-pulse rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum comentário ainda. Seja o primeiro a comentar!
                    </p>
                  ) : (
                    comments.map(comment => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        onReply={handleReply}
                        onToggleReaction={toggleReaction}
                        onEditComment={updateComment}
                        currentUserId={currentUserId}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {activeSection === 'attachments' && (
              <div className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum anexo ainda
                  </p>
                ) : (
                  attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center">
                        {getFileIcon(attachment.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.user_name} • {formatFileSize(attachment.file_size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(attachment.file_path)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteAttachment(attachment.id, attachment.file_path)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}

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
            )}
          </div>
        </ScrollArea>

        {/* Comment Input */}
        {activeSection === 'comments' && (
          <div className="shrink-0 p-4 border-t bg-background">
            {replyingToComment && (
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Reply className="h-3.5 w-3.5" />
                <span>
                  Respondendo a <strong>{replyingToComment.user_name}</strong>
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-auto hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                placeholder={replyingTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                className="resize-none flex-1 min-h-[80px]"
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
        )}

        {/* Delete Button */}
        {isAdmin && onDelete && (
          <div className="shrink-0 p-4 pt-0 border-t-0 bg-background">
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
