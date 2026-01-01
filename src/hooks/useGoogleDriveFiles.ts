import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
}

const DRIVE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-files`;

export function useGoogleDriveFiles(clientId?: string | null) {
  const { session } = useAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!clientId || !session?.access_token) {
      setError('Cliente não selecionado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(DRIVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar arquivos');
      }

      setFiles(data.files || []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar arquivos');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, session]);

  const getFileContent = useCallback(async (fileId: string): Promise<string | null> => {
    if (!clientId || !session?.access_token) return null;

    try {
      const response = await fetch(DRIVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          clientId,
          action: 'getContent',
          fileId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar conteúdo');
      }

      return data.content || null;
    } catch (err) {
      console.error('Error fetching file content:', err);
      return null;
    }
  }, [clientId, session]);

  return {
    files,
    isLoading,
    error,
    fetchFiles,
    getFileContent,
  };
}
