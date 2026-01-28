import { useState } from 'react';
import { Copy, Check, Trash2, FileText, Hash, Image, Layers, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { type AIGeneratedContent } from '@/hooks/useAIGeneratedContent';

interface ContentPreviewProps {
  content: AIGeneratedContent;
  onClear: () => void;
  onPublishToCalendar?: () => void;
}

export function ContentPreview({ content, onClear, onPublishToCalendar }: ContentPreviewProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copiado!' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={() => copyToClipboard(text, field)}
    >
      {copiedField === field ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  const renderBlogArticle = () => (
    <div className="space-y-4">
      {content.seo_title && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Título SEO</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {content.seo_title.length}/60
              </span>
              <CopyButton text={content.seo_title} field="seo_title" />
            </div>
          </div>
          <p className="text-sm font-medium">{content.seo_title}</p>
        </div>
      )}

      {content.meta_description && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Meta Descrição</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {content.meta_description.length}/120
              </span>
              <CopyButton text={content.meta_description} field="meta_description" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{content.meta_description}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {content.word_count && (
          <Badge variant="outline" className="text-xs">
            {content.word_count} palavras
          </Badge>
        )}
        {content.keyword_density && (
          <Badge variant="outline" className="text-xs">
            Densidade: {content.keyword_density}%
          </Badge>
        )}
        {content.readability_score && (
          <Badge variant="outline" className="text-xs">
            Legibilidade: {content.readability_score}
          </Badge>
        )}
      </div>

      <Separator />

      {content.content && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Conteúdo do Artigo
            </span>
            <CopyButton text={content.content} field="content" />
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 rounded-lg p-4 max-h-[300px] overflow-y-auto">
            <div className="whitespace-pre-wrap text-sm">{content.content}</div>
          </div>
        </div>
      )}

      {content.image_suggestions && content.image_suggestions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Image className="h-3 w-3" />
            Sugestões de Imagem
          </span>
          <ul className="text-sm space-y-1 bg-muted/30 rounded-lg p-3">
            {content.image_suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderSocialPost = () => (
    <div className="space-y-4">
      {content.title && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Título</span>
            <CopyButton text={content.title} field="title" />
          </div>
          <p className="text-lg font-bold">{content.title}</p>
        </div>
      )}

      {content.content && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Legenda</span>
            <CopyButton text={content.content} field="content" />
          </div>
          <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-wrap text-sm">
            {content.content}
          </div>
        </div>
      )}

      {content.hashtags && content.hashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Hashtags
            </span>
            <CopyButton text={content.hashtags.map(h => `#${h}`).join(' ')} field="hashtags" />
          </div>
          <div className="flex flex-wrap gap-1">
            {content.hashtags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {content.image_suggestions && content.image_suggestions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Image className="h-3 w-3" />
            Briefing para o Designer
          </span>
          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            {content.image_suggestions[0]}
          </div>
        </div>
      )}
    </div>
  );

  const renderCarousel = () => (
    <div className="space-y-4">
      {content.title && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Título (Capa)</span>
            <CopyButton text={content.title} field="title" />
          </div>
          <p className="text-lg font-bold">{content.title}</p>
        </div>
      )}

      {content.slides && content.slides.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Slides ({content.slides.length})
          </span>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {content.slides.map((slide, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">
                    Slide {i + 1}
                  </span>
                  <CopyButton 
                    text={`${slide.title}\n\n${slide.content}`} 
                    field={`slide-${i}`} 
                  />
                </div>
                <p className="font-medium text-sm">{slide.title}</p>
                <p className="text-sm text-muted-foreground">{slide.content}</p>
                {slide.image_suggestion && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    📸 {slide.image_suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {content.content && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Legenda do Post</span>
            <CopyButton text={content.content} field="content" />
          </div>
          <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-wrap text-sm">
            {content.content}
          </div>
        </div>
      )}

      {content.hashtags && content.hashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Hashtags</span>
            <CopyButton text={content.hashtags.map(h => `#${h}`).join(' ')} field="hashtags" />
          </div>
          <div className="flex flex-wrap gap-1">
            {content.hashtags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStoriesReels = () => (
    <div className="space-y-4">
      {content.title && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Conceito</span>
          <p className="text-lg font-bold">{content.title}</p>
        </div>
      )}

      {content.slides && content.slides.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Roteiro ({content.slides.length} cenas)
          </span>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {content.slides.map((slide, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">
                    {slide.title}
                  </span>
                </div>
                <p className="text-sm">{slide.content}</p>
                {slide.image_suggestion && (
                  <p className="text-xs text-muted-foreground italic">
                    🎬 {slide.image_suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {content.content && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Roteiro Completo</span>
            <CopyButton text={content.content} field="content" />
          </div>
          <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-wrap text-sm">
            {content.content}
          </div>
        </div>
      )}

      {content.image_suggestions && content.image_suggestions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Sugestões Visuais</span>
          <ul className="text-sm space-y-1 bg-muted/30 rounded-lg p-3">
            {content.image_suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">
          {content.content_type === 'blog_article' && 'Artigo de Blog'}
          {content.content_type === 'social_post' && 'Post Feed'}
          {content.content_type === 'carousel' && 'Carrossel'}
          {content.content_type === 'stories' && 'Stories'}
          {content.content_type === 'reels' && 'Reels'}
        </Badge>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trash2 className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      {content.content_type === 'blog_article' && renderBlogArticle()}
      {content.content_type === 'social_post' && renderSocialPost()}
      {content.content_type === 'carousel' && renderCarousel()}
      {(content.content_type === 'stories' || content.content_type === 'reels') && renderStoriesReels()}

      <Separator className="my-4" />

      {onPublishToCalendar && (
        <Button 
          onClick={onPublishToCalendar} 
          className="w-full gap-2"
          variant="default"
        >
          <CalendarPlus className="h-4 w-4" />
          Publicar no Calendário Editorial
        </Button>
      )}
    </div>
  );
}
