import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { ContentType, ContentStatus, EditorialContent, CreateContentData } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';

interface ContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content?: EditorialContent | null;
  clientId?: string;
  clients?: { id: string; name: string }[];
  onSave: (data: CreateContentData & { id?: string }) => void;
  isLoading?: boolean;
}

const contentTypes: ContentType[] = ['instagram', 'facebook', 'blog', 'email', 'google_ads', 'other'];
const contentStatuses: ContentStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'published'];

export function ContentModal({
  open,
  onOpenChange,
  content,
  clientId,
  clients,
  onSave,
  isLoading,
}: ContentModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType>('instagram');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const isEditing = !!content;

  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setDescription(content.description || '');
      setContentType(content.content_type);
      setScheduledDate(new Date(content.scheduled_date));
      setStatus(content.status);
      setSelectedClientId(content.client_id);
    } else {
      setTitle('');
      setDescription('');
      setContentType('instagram');
      setScheduledDate(new Date());
      setStatus('draft');
      setSelectedClientId(clientId || '');
    }
  }, [content, clientId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !scheduledDate || (!selectedClientId && !clientId)) {
      return;
    }

    onSave({
      id: content?.id,
      client_id: selectedClientId || clientId!,
      title: title.trim(),
      description: description.trim() || undefined,
      content_type: contentType,
      scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Conteúdo' : 'Novo Conteúdo'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Edite as informações do conteúdo programado.'
                : 'Adicione um novo conteúdo ao calendário editorial.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {clients && clients.length > 0 && !clientId && (
              <div className="grid gap-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Post dia das mães"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes sobre o conteúdo..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Conteúdo</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getContentTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {getContentStatusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Data de Publicação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim() || !scheduledDate}>
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
