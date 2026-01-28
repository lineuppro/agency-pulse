import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SocialPostFormProps {
  onGenerate: (input: {
    topic: string;
    additional_instructions?: string;
  }) => Promise<void>;
  isGenerating: boolean;
}

export function SocialPostForm({ onGenerate, isGenerating }: SocialPostFormProps) {
  const [topic, setTopic] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    await onGenerate({
      topic,
      additional_instructions: additionalInstructions || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="topic">Tema do Post *</Label>
        <Textarea
          id="topic"
          placeholder="Ex: Lançamento de produto novo, dica de produtividade, bastidores da empresa..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instruções Adicionais</Label>
        <Textarea
          id="instructions"
          placeholder="Ex: Tom mais descontraído, incluir pergunta para engajamento, mencionar promoção..."
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          rows={3}
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="text-sm font-medium">O post incluirá:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✓ Título chamativo</li>
          <li>✓ Legenda com storytelling e emojis</li>
          <li>✓ Hashtags relevantes (5-10)</li>
          <li>✓ CTA (call-to-action)</li>
          <li>✓ Sugestão detalhada de imagem para o designer</li>
        </ul>
      </div>

      <Button 
        type="submit" 
        className="w-full gap-2" 
        disabled={!topic.trim() || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando post...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar Post
          </>
        )}
      </Button>
    </form>
  );
}
