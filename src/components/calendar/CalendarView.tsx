import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentCard } from './ContentCard';
import type { EditorialContent, ContentStatus } from '@/hooks/useEditorialCalendar';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CalendarViewProps {
  contents: EditorialContent[];
  view: 'week' | 'month';
  onViewChange: (view: 'week' | 'month') => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  isAdmin?: boolean;
  onContentClick?: (content: EditorialContent) => void;
  onContentEdit?: (content: EditorialContent) => void;
  onContentDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ContentStatus) => void;
  onDateUpdate?: (id: string, newDate: string) => void;
}

interface DraggableContentCardProps {
  content: EditorialContent;
  compact: boolean;
  isAdmin: boolean;
  onContentClick?: (content: EditorialContent) => void;
  onContentEdit?: (content: EditorialContent) => void;
  onContentDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ContentStatus) => void;
}

function DraggableContentCard({
  content,
  compact,
  isAdmin,
  onContentClick,
  onContentEdit,
  onContentDelete,
  onStatusChange,
}: DraggableContentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: content.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ContentCard
        content={content}
        compact={compact}
        isAdmin={isAdmin}
        onClick={onContentClick}
        onEdit={onContentEdit}
        onDelete={onContentDelete}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

export function CalendarView({
  contents,
  view,
  onViewChange,
  currentDate,
  onDateChange,
  isAdmin = false,
  onContentClick,
  onContentEdit,
  onContentDelete,
  onStatusChange,
  onDateUpdate,
}: CalendarViewProps) {
  const [activeContent, setActiveContent] = useState<EditorialContent | null>(null);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const days = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, view]);

  const contentsByDate = useMemo(() => {
    const map = new Map<string, EditorialContent[]>();
    contents.forEach((content) => {
      const dateKey = content.scheduled_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(content);
    });
    return map;
  }, [contents]);

  const handlePrevious = () => {
    if (view === 'month') {
      onDateChange(subMonths(currentDate, 1));
    } else {
      onDateChange(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      onDateChange(addMonths(currentDate, 1));
    } else {
      onDateChange(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const handleDragStart = (event: DragStartEvent) => {
    const content = contents.find(c => c.id === event.active.id);
    if (content) setActiveContent(content);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveContent(null);
    const { active, over } = event;

    if (!over || !onDateUpdate) return;

    const contentId = active.id as string;
    const newDate = over.id as string;

    // Check if it's a valid date format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      const content = contents.find(c => c.id === contentId);
      if (content && content.scheduled_date !== newDate) {
        onDateUpdate(contentId, newDate);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Hoje
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {view === 'month'
              ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
              : `${format(startOfWeek(currentDate), "dd 'de' MMM", { locale: ptBR })} - ${format(endOfWeek(currentDate), "dd 'de' MMM", { locale: ptBR })}`}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Semana
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Mês
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 border rounded-lg overflow-hidden bg-card">
          {/* Week day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div
            className={cn(
              'grid grid-cols-7',
              view === 'month' ? 'auto-rows-fr' : 'h-[calc(100%-40px)]'
            )}
          >
            {days.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayContents = contentsByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <DroppableDay
                  key={index}
                  dateKey={dateKey}
                  day={day}
                  dayContents={dayContents}
                  isCurrentMonth={isCurrentMonth}
                  isCurrentDay={isCurrentDay}
                  view={view}
                  isAdmin={isAdmin}
                  onContentClick={onContentClick}
                  onContentEdit={onContentEdit}
                  onContentDelete={onContentDelete}
                  onStatusChange={onStatusChange}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeContent ? (
            <div className="shadow-lg rotate-3">
              <ContentCard
                content={activeContent}
                compact={view === 'month'}
                isAdmin={isAdmin}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface DroppableDayProps {
  dateKey: string;
  day: Date;
  dayContents: EditorialContent[];
  isCurrentMonth: boolean;
  isCurrentDay: boolean;
  view: 'week' | 'month';
  isAdmin: boolean;
  onContentClick?: (content: EditorialContent) => void;
  onContentEdit?: (content: EditorialContent) => void;
  onContentDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ContentStatus) => void;
}

function DroppableDay({
  dateKey,
  day,
  dayContents,
  isCurrentMonth,
  isCurrentDay,
  view,
  isAdmin,
  onContentClick,
  onContentEdit,
  onContentDelete,
  onStatusChange,
}: DroppableDayProps) {
  const { setNodeRef, isOver } = useSortable({
    id: dateKey,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-b border-r p-1 min-h-[100px] transition-colors',
        view === 'week' && 'min-h-[400px]',
        !isCurrentMonth && 'bg-muted/30',
        isCurrentDay && 'bg-primary/5',
        isOver && 'bg-primary/10 border-primary'
      )}
    >
      <div
        className={cn(
          'text-sm font-medium mb-1 p-1 rounded-full w-7 h-7 flex items-center justify-center',
          isCurrentDay && 'bg-primary text-primary-foreground',
          !isCurrentMonth && 'text-muted-foreground'
        )}
      >
        {format(day, 'd')}
      </div>

      <div className={cn(
        'space-y-1 overflow-y-auto',
        view === 'month' ? 'max-h-[80px]' : 'max-h-[350px]'
      )}>
        {dayContents.map((content) => (
          <DraggableContentCard
            key={content.id}
            content={content}
            compact={view === 'month'}
            isAdmin={isAdmin}
            onContentClick={onContentClick}
            onContentEdit={onContentEdit}
            onContentDelete={onContentDelete}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
