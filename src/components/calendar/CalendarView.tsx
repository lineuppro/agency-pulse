import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentCard } from './ContentCard';
import type { EditorialContent, ContentStatus } from '@/hooks/useEditorialCalendar';

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
}: CalendarViewProps) {
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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
              <div
                key={index}
                className={cn(
                  'border-b border-r p-1 min-h-[100px]',
                  view === 'week' && 'min-h-[400px]',
                  !isCurrentMonth && 'bg-muted/30',
                  isCurrentDay && 'bg-primary/5'
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
                    <ContentCard
                      key={content.id}
                      content={content}
                      compact={view === 'month'}
                      isAdmin={isAdmin}
                      onClick={onContentClick}
                      onEdit={onContentEdit}
                      onDelete={onContentDelete}
                      onStatusChange={onStatusChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
