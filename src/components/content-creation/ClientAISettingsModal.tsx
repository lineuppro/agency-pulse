import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useClientAISettings } from '@/hooks/useClientAISettings';

interface ClientAISettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function ClientAISettingsModal({ 
  open, 
  onOpenChange, 
  clientId 
}: ClientAISettingsModalProps) {
  const { settings, isLoading, upsertSettings } = useClientAISettings(clientId);

  const [brandVoice, setBrandVoice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandKeywords, setBrandKeywords] = useState('');
  const [contentGuidelines, setContentGuidelines] = useState('');
  const [defaultWordCount, setDefaultWordCount] = useState(1500);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    if (settings) {
      setBrandVoice(settings.brand_voice || '');
      setTargetAudience(settings.target_audience || '');
      setBrandKeywords(settings.brand_keywords?.join(', ') || '');
      setContentGuidelines(settings.content_guidelines || '');
      setDefaultWordCount(settings.default_word_count || 1500);
      setCustomPrompt(settings.custom_prompt || '');
    } else {
      // Reset to defaults
      setBrandVoice('');
      setTargetAudience('');
      setBrandKeywords('');
      setContentGuidelines('');
      setDefaultWordCount(1500);
      setCustomPrompt('');
    }
  }, [settings, open]);

  const handleSave = async () => {
    await upsertSettings.mutateAsync({
      client_id: clientId,
      brand_voice: brandVoice || null,
      target_audience: targetAudience || null,
      brand_keywords: brandKeywords 
        ? brandKeywords.split(',').map(k => k.trim()).filter(Boolean) 
        : null,
      content_guidelines: contentGuidelines || null,
      default_word_count: defaultWordCount,
      custom_prompt: customPrompt || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de IA do Cliente</DialogTitle>
          <DialogDescription>
            Defina o tom de voz, público-alvo e diretrizes para guiar a geração de conteúdo.
            Essas configurações são privadas e visíveis apenas para administradores.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandVoice">Tom de Voz da Marca</Label>
              <Textarea
                id="brandVoice"
                placeholder="Ex: Profissional mas acessível, usa linguagem simples sem jargões, tom amigável e consultivo..."
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Público-Alvo</Label>
              <Textarea
                id="targetAudience"
                placeholder="Ex: Empreendedores e gestores de pequenas empresas, 30-50 anos, que buscam crescer com marketing digital..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandKeywords">Palavras-chave da Marca</Label>
              <Input
                id="brandKeywords"
                placeholder="Ex: inovação, resultados, parceria, crescimento (separadas por vírgula)"
                value={brandKeywords}
                onChange={(e) => setBrandKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Palavras que devem aparecer frequentemente no conteúdo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentGuidelines">Diretrizes de Conteúdo</Label>
              <Textarea
                id="contentGuidelines"
                placeholder="Ex: Sempre incluir dados e estatísticas quando possível. Evitar termos técnicos sem explicação. Citar cases de sucesso da empresa..."
                value={contentGuidelines}
                onChange={(e) => setContentGuidelines(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultWordCount">Quantidade Padrão de Palavras (Artigos)</Label>
              <Input
                id="defaultWordCount"
                type="number"
                min={500}
                max={5000}
                value={defaultWordCount}
                onChange={(e) => setDefaultWordCount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPrompt">Instruções Personalizadas (Prompt Adicional)</Label>
              <Textarea
                id="customPrompt"
                placeholder="Instruções específicas que serão adicionadas a cada geração de conteúdo para este cliente..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Texto que será incluído em todas as gerações de conteúdo deste cliente
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={upsertSettings.isPending}
            className="gap-2"
          >
            {upsertSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
