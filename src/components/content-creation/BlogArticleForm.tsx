import { useState } from 'react';
import { Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BlogArticleFormProps {
  onGenerate: (input: {
    topic: string;
    main_keyword?: string;
    target_word_count?: number;
    additional_instructions?: string;
  }) => Promise<void>;
  isGenerating: boolean;
}

export function BlogArticleForm({ onGenerate, isGenerating }: BlogArticleFormProps) {
  const [topic, setTopic] = useState('');
  const [mainKeyword, setMainKeyword] = useState('');
  const [wordCount, setWordCount] = useState(1500);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    await onGenerate({
      topic,
      main_keyword: mainKeyword || undefined,
      target_word_count: wordCount,
      additional_instructions: additionalInstructions || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="topic">Tema do Artigo *</Label>
        <Textarea
          id="topic"
          placeholder="Ex: Como aumentar as vendas online em 2026 usando estratégias de marketing digital"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="keyword">Palavra-chave Principal</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>A palavra-chave será usada no título, introdução, subtítulos e corpo do texto com densidade de 0.5-2.5% (Yoast SEO)</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id="keyword"
          placeholder="Ex: marketing digital"
          value={mainKeyword}
          onChange={(e) => setMainKeyword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="wordCount">Quantidade de Palavras</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Recomendado: 1500+ palavras para melhor SEO</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id="wordCount"
          type="number"
          min={500}
          max={5000}
          value={wordCount}
          onChange={(e) => setWordCount(Number(e.target.value))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instruções Adicionais</Label>
        <Textarea
          id="instructions"
          placeholder="Ex: Mencionar cases de sucesso da empresa, focar em e-commerce B2B..."
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          rows={3}
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="text-sm font-medium">O artigo incluirá automaticamente:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✓ Título SEO (máx. 60 caracteres)</li>
          <li>✓ Meta descrição (100-120 chars com CTA)</li>
          <li>✓ Estrutura H2/H3 otimizada</li>
          <li>✓ Densidade de palavra-chave 0.5-2.5%</li>
          <li>✓ Parágrafos curtos e palavras de transição</li>
          <li>✓ Sugestões de links internos e externos</li>
          <li>✓ Sugestões de imagens para o designer</li>
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
            Gerando artigo...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar Artigo SEO
          </>
        )}
      </Button>
    </form>
  );
}
