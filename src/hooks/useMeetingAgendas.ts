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

export function useMeetingAgendas(clientId?: string | null) {
  const { user } = useAuth();
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
        .limit(20);

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
    generatedSummary: string | null = null
  ): Promise<MeetingAgenda | null> => {
    if (!user?.id || !clientId) return null;

    try {
      const { data, error } = await supabase
        .from('meeting_agendas')
        .insert({
          client_id: clientId,
          created_by: user.id,
          title,
          notes,
          generated_summary: generatedSummary,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchAgendas();
      return data as MeetingAgenda;
    } catch (err) {
      console.error('Error creating agenda:', err);
      return null;
    }
  }, [user?.id, clientId, fetchAgendas]);

  const updateAgenda = useCallback(async (
    agendaId: string,
    updates: Partial<Pick<MeetingAgenda, 'title' | 'notes' | 'generated_summary'>>
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

  return {
    agendas,
    isLoading,
    fetchAgendas,
    createAgenda,
    updateAgenda,
    deleteAgenda,
  };
}
