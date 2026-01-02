-- Add meeting_agenda_id to tasks table to link tasks to meetings
ALTER TABLE public.tasks 
ADD COLUMN meeting_agenda_id UUID REFERENCES public.meeting_agendas(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_tasks_meeting_agenda_id ON public.tasks(meeting_agenda_id);