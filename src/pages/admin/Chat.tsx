import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChatRAG } from '@/hooks/useChatRAG';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminChat() {
  const { session } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const { messages, isLoading, error, sendMessage, clearMessages } = useChatRAG(selectedClientId || null);
  const [input, setInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: clients } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, google_drive_id')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleSyncDocuments = async () => {
    if (!selectedClientId || !session?.access_token) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-drive-documents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ clientId: selectedClientId }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }
      
      toast.success(`Sincronização concluída: ${data.synced} documentos atualizados`);
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Erro ao sincronizar documentos');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClientChange = (value: string) => {
    setSelectedClientId(value);
    clearMessages();
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chat com IA</h1>
          <p className="text-muted-foreground mt-1">
            Análise rápida com contexto dos documentos do cliente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClientId} onValueChange={handleClientChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient?.google_drive_id && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleSyncDocuments}
              disabled={isSyncing}
              title="Sincronizar documentos do Drive"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          {messages.length > 0 && (
            <Button variant="outline" size="icon" onClick={clearMessages} title="Limpar conversa">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Assistente AgencyOS
            {selectedClient && (
              <span className="text-muted-foreground font-normal">
                • Contexto: {selectedClient.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {!selectedClientId ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Selecione um cliente
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Escolha um cliente acima para iniciar uma conversa com contexto dos documentos dele.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Como posso ajudar?
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Pergunte sobre campanhas, documentos, estratégias ou qualquer informação do cliente.
                  {selectedClient?.google_drive_id && (
                    <span className="block mt-2 text-primary">
                      💡 Clique no ícone de sincronização para atualizar os documentos do Drive.
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {error && (
            <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="p-4 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedClientId ? "Digite sua mensagem..." : "Selecione um cliente primeiro"}
                disabled={isLoading || !selectedClientId}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isLoading || !selectedClientId}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
