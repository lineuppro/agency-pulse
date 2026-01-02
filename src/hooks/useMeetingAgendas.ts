import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MeetingAgenda {
  id: string;
  client_id: string;
  created_by: string;
  title: string | null;
  notes: string | null;
  generated_summary: string | null;
  meeting_date: string;
  created_at: string;
  updated_at: string;
}

export interface AgendaTask {
  id?: string;
  title: string;
  description?: string;
  category: 'ads' | 'dev' | 'automation' | 'creative';
  assigned_to?: string;
  due_date?: string;
}

export function useMeetingAgendas(clientId?: string | null) {
  const { user, session } = useAuth();
  const [agendas, setAgendas] = useState<MeetingAgenda[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAgendas = useCallback(async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_agendas')
        .select('*')
        .eq('client_id', clientId)
        .order('meeting_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAgendas((data || []) as MeetingAgenda[]);
    } catch (err) {
      console.error('Error fetching agendas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  const createAgenda = useCallback(async (
    title: string,
    notes: string,
    meetingDate: Date,
    generatedSummary: string | null = null,
    tasks: AgendaTask[] = []
  ): Promise<MeetingAgenda | null> => {
    if (!user?.id || !clientId) return null;

    try {
      // Create the agenda
      const { data: agenda, error: agendaError } = await supabase
        .from('meeting_agendas')
        .insert({
          client_id: clientId,
          created_by: user.id,
          title,
          notes,
          generated_summary: generatedSummary,
          meeting_date: meetingDate.toISOString(),
        })
        .select()
        .single();

      if (agendaError) throw agendaError;

      // Create tasks linked to this agenda
      if (tasks.length > 0 && agenda) {
        const tasksToInsert = tasks.map(task => ({
          client_id: clientId,
          title: task.title,
          description: task.description || null,
          category: task.category,
          assigned_to: task.assigned_to || null,
          due_date: task.due_date || null,
          meeting_agenda_id: agenda.id,
          status: 'pending' as const,
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('Error creating tasks:', tasksError);
        }
      }

      await fetchAgendas();
      return agenda as MeetingAgenda;
    } catch (err) {
      console.error('Error creating agenda:', err);
      return null;
    }
  }, [user?.id, clientId, fetchAgendas]);

  const updateAgenda = useCallback(async (
    agendaId: string,
    updates: Partial<Pick<MeetingAgenda, 'title' | 'notes' | 'generated_summary' | 'meeting_date'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('meeting_agendas')
        .update(updates)
        .eq('id', agendaId);

      if (error) throw error;
      await fetchAgendas();
      return true;
    } catch (err) {
      console.error('Error updating agenda:', err);
      return false;
    }
  }, [fetchAgendas]);

  const deleteAgenda = useCallback(async (agendaId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('meeting_agendas')
        .delete()
        .eq('id', agendaId);

      if (error) throw error;
      await fetchAgendas();
      return true;
    } catch (err) {
      console.error('Error deleting agenda:', err);
      return false;
    }
  }, [fetchAgendas]);

  const generateSummary = useCallback(async (notes: string): Promise<string | null> => {
    if (!session?.access_token || !clientId) return null;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meeting-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ clientId, notes }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      return data.summary;
    } catch (err) {
      console.error('Error generating summary:', err);
      throw err;
    }
  }, [session?.access_token, clientId]);

  const fetchAgendaTasks = useCallback(async (agendaId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('meeting_agenda_id', agendaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching agenda tasks:', err);
      return [];
    }
  }, []);

  return {
    agendas,
    isLoading,
    fetchAgendas,
    createAgenda,
    updateAgenda,
    deleteAgenda,
    generateSummary,
    fetchAgendaTasks,
  };
}
