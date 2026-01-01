import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function useChatSessions(clientId?: string | null) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all sessions for the current user/client
  const fetchSessions = useCallback(async () => {
    if (!user?.id || !clientId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, clientId]);

  // Fetch messages for a specific session
  const fetchSessionMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(m => ({
        ...m,
        role: m.role as 'user' | 'assistant',
      }));
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, []);

  // Create a new session
  const createSession = useCallback(async (title?: string): Promise<string | null> => {
    if (!user?.id || !clientId) return null;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          client_id: clientId,
          user_id: user.id,
          title: title || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSessionId(data.id);
      await fetchSessions();
      return data.id;
    } catch (err) {
      console.error('Error creating session:', err);
      return null;
    }
  }, [user?.id, clientId, fetchSessions]);

  // Save a message to the current session
  const saveMessage = useCallback(async (
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
        });

      if (error) throw error;

      // Update session's updated_at
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      return true;
    } catch (err) {
      console.error('Error saving message:', err);
      return false;
    }
  }, []);

  // Update session title (usually after first message)
  const updateSessionTitle = useCallback(async (sessionId: string, title: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId);

      if (error) throw error;
      await fetchSessions();
      return true;
    } catch (err) {
      console.error('Error updating session title:', err);
      return false;
    }
  }, [fetchSessions]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      // Messages will be cascade deleted due to FK
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      await fetchSessions();
      return true;
    } catch (err) {
      console.error('Error deleting session:', err);
      return false;
    }
  }, [currentSessionId, fetchSessions]);

  useEffect(() => {
    if (clientId && user?.id) {
      fetchSessions();
    }
  }, [clientId, user?.id, fetchSessions]);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    isLoading,
    fetchSessions,
    fetchSessionMessages,
    createSession,
    saveMessage,
    updateSessionTitle,
    deleteSession,
  };
}
