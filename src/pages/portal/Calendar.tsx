import { useState, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ContentDetailModal } from '@/components/calendar/ContentDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useEditorialCalendar, 
  type EditorialContent,
  type ContentStatus 
} from '@/hooks/useEditorialCalendar';

export default function PortalCalendar() {
  const { clientId } = useAuth();
  const [view, setView] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingContent, setViewingContent] = useState<EditorialContent | null>(null);

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
    updateStatus 
  } = useEditorialCalendar(
    clientId || undefined,
    dateRange.start,
    dateRange.end
  );

  const handleContentClick = (content: EditorialContent) => {
    setViewingContent(content);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = (id: string, status: ContentStatus) => {
    updateStatus.mutate({ id, status });
  };

  // Count pending approvals
  const pendingCount = contents.filter(c => c.status === 'pending_approval').length;

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
              Visualize e aprove os conteúdos programados
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            <span className="font-medium">{pendingCount}</span> conteúdo(s) aguardando aprovação
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <CalendarView
          contents={contents}
          view={view}
          onViewChange={setView}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          isAdmin={false}
          onContentClick={handleContentClick}
          onStatusChange={handleStatusChange}
        />
      </div>

      <ContentDetailModal
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) setViewingContent(null);
        }}
        content={viewingContent}
        isAdmin={false}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
