import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CalendarDays, FolderPlus, Filter, Sparkles, List, LayoutGrid } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ContentListView } from '@/components/calendar/ContentListView';
import { ContentModal } from '@/components/calendar/ContentModal';
import { ContentSidebar } from '@/components/calendar/ContentSidebar';
import { CampaignModal } from '@/components/calendar/CampaignModal';
import { 
  useEditorialCalendar, 
  type EditorialContent,
  type ContentStatus,
  type ContentType
} from '@/hooks/useEditorialCalendar';
import { useEditorialCampaigns } from '@/hooks/useEditorialCampaigns';

export default function AdminCalendar() {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [view, setView] = useState<'week' | 'month'>('month');
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // Fetch campaigns for filtering
  const { campaigns, createCampaign } = useEditorialCampaigns(
    selectedClientId === 'all' ? undefined : selectedClientId
  );

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
    dateRange.end,
    selectedCampaignId === 'all' ? undefined : selectedCampaignId
  );

  // Get campaign name for sidebar
  const getCampaignName = (campaignId: string | null) => {
    if (!campaignId) return undefined;
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.name;
  };

  const handleSaveContent = (data: { id?: string; client_id: string; title: string; description?: string; content_type: ContentType; scheduled_date: string; status?: ContentStatus }) => {
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

  const handleSidebarSave = (data: { 
    id: string; 
    title: string; 
    description?: string; 
    content_type: ContentType;
    scheduled_date: string;
    status: ContentStatus;
  }) => {
    updateContent.mutate({
      id: data.id,
      title: data.title,
      description: data.description,
      content_type: data.content_type,
      scheduled_date: data.scheduled_date,
      status: data.status,
    }, {
      onSuccess: () => {
        setIsSidebarOpen(false);
        setViewingContent(null);
      },
    });
  };

  const handleEditContent = (content: EditorialContent) => {
    setEditingContent(content);
    setIsModalOpen(true);
  };

  const handleContentClick = (content: EditorialContent) => {
    setViewingContent(content);
    setIsSidebarOpen(true);
  };

  const handleDeleteContent = (id: string) => {
    deleteContent.mutate(id, {
      onSuccess: () => {
        setIsSidebarOpen(false);
        setViewingContent(null);
      },
    });
  };

  const handleStatusChange = (id: string, status: ContentStatus) => {
    updateStatus.mutate({ id, status });
  };

  const handleCreateCampaign = (data: Parameters<typeof createCampaign.mutate>[0]) => {
    createCampaign.mutate(data, {
      onSuccess: () => {
        setIsCampaignModalOpen(false);
      },
    });
  };

  // Reset campaign filter when client changes
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedCampaignId('all');
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
          <Select value={selectedClientId} onValueChange={handleClientChange}>
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

          {campaigns.length > 0 && (
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" onClick={() => setIsCampaignModalOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Criar Campanha
          </Button>

          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/content-creation')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Gerar com IA
          </Button>

          <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as 'calendar' | 'list')}>
            <TabsList className="h-9">
              <TabsTrigger value="calendar" className="px-3">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="px-3">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => { setEditingContent(null); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Conteúdo
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {displayMode === 'calendar' ? (
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
        ) : (
          <ContentListView 
            contents={contents} 
            isAdmin={true}
          />
        )}
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

      <ContentSidebar
        open={isSidebarOpen}
        onOpenChange={(open) => {
          setIsSidebarOpen(open);
          if (!open) setViewingContent(null);
        }}
        content={viewingContent}
        isAdmin={true}
        campaignName={viewingContent ? getCampaignName(viewingContent.campaign_id) : undefined}
        onSave={handleSidebarSave}
        onDelete={handleDeleteContent}
        onStatusChange={handleStatusChange}
        isLoading={updateContent.isPending}
      />

      <CampaignModal
        open={isCampaignModalOpen}
        onOpenChange={setIsCampaignModalOpen}
        clients={clients}
        selectedClientId={selectedClientId !== 'all' ? selectedClientId : undefined}
        onSave={handleCreateCampaign}
        isLoading={createCampaign.isPending}
      />
    </div>
  );
}
