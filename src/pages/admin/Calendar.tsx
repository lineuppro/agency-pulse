import { useState, useMemo } from 'react';
import { Plus, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ContentModal } from '@/components/calendar/ContentModal';
import { ContentDetailModal } from '@/components/calendar/ContentDetailModal';
import { 
  useEditorialCalendar, 
  type EditorialContent,
  type ContentStatus 
} from '@/hooks/useEditorialCalendar';

export default function AdminCalendar() {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [view, setView] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<EditorialContent | null>(null);
  const [viewingContent, setViewingContent] = useState<EditorialContent | null>(null);

  // Fetch clients for the selector
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfWeek(monthStart),
        end: endOfWeek(monthEnd),
      };
    } else {
      return {
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate),
      };
    }
  }, [currentDate, view]);

  const { 
    contents, 
    isLoading, 
    createContent, 
    updateContent, 
    deleteContent,
    updateStatus 
  } = useEditorialCalendar(
    selectedClientId === 'all' ? undefined : selectedClientId,
    dateRange.start,
    dateRange.end
  );

  const handleSaveContent = (data: { id?: string; client_id: string; title: string; description?: string; content_type: any; scheduled_date: string; status?: ContentStatus }) => {
    if (data.id) {
      updateContent.mutate({
        id: data.id,
        title: data.title,
        description: data.description,
        content_type: data.content_type,
        scheduled_date: data.scheduled_date,
        status: data.status,
      }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEditingContent(null);
        },
      });
    } else {
      createContent.mutate({
        client_id: data.client_id,
        title: data.title,
        description: data.description,
        content_type: data.content_type,
        scheduled_date: data.scheduled_date,
        status: data.status,
      }, {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      });
    }
  };

  const handleEditContent = (content: EditorialContent) => {
    setEditingContent(content);
    setIsModalOpen(true);
  };

  const handleContentClick = (content: EditorialContent) => {
    setViewingContent(content);
    setIsDetailModalOpen(true);
  };

  const handleDeleteContent = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este conteúdo?')) {
      deleteContent.mutate(id);
    }
  };

  const handleStatusChange = (id: string, status: ContentStatus) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Calendário Editorial</h1>
            <p className="text-muted-foreground">
              Gerencie os conteúdos programados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[200px]">
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

          <Button onClick={() => { setEditingContent(null); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Conteúdo
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CalendarView
          contents={contents}
          view={view}
          onViewChange={setView}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          isAdmin={true}
          onContentClick={handleContentClick}
          onContentEdit={handleEditContent}
          onContentDelete={handleDeleteContent}
          onStatusChange={handleStatusChange}
        />
      </div>

      <ContentModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingContent(null);
        }}
        content={editingContent}
        clientId={selectedClientId !== 'all' ? selectedClientId : undefined}
        clients={clients}
        onSave={handleSaveContent}
        isLoading={createContent.isPending || updateContent.isPending}
      />

      <ContentDetailModal
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) setViewingContent(null);
        }}
        content={viewingContent}
        isAdmin={true}
        onEdit={handleEditContent}
        onDelete={handleDeleteContent}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
