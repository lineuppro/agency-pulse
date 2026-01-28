import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface StoriesReelsFormProps {
  onGenerate: (input: {
    topic: string;
    additional_instructions?: string;
  }) => Promise<void>;
  isGenerating: boolean;
}

export function StoriesReelsForm({ onGenerate, isGenerating }: StoriesReelsFormProps) {
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
        <Label htmlFor="topic">Tema do Story/Reels *</Label>
        <Textarea
          id="topic"
          placeholder="Ex: Tour pelo escritório, tutorial rápido de um produto, resposta a uma pergunta frequente..."
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
          placeholder="Ex: Usar enquete, tom humorístico, incluir música animada, duração de 30s..."
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          rows={3}
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="text-sm font-medium">O roteiro incluirá:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✓ Hook inicial impactante (3s cruciais)</li>
          <li>✓ Sequência de stories/cenas</li>
          <li>✓ Texto + indicações de ação por cena</li>
          <li>✓ Sugestões de stickers e elementos interativos</li>
          <li>✓ CTA final (arraste, responda, etc.)</li>
          <li>✓ Hashtags para Reels</li>
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
            Gerando roteiro...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar Roteiro
          </>
        )}
      </Button>
    </form>
  );
}
