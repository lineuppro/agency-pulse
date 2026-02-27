import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Instagram,
  Facebook,
  Upload,
  X,
  Calendar,
  Clock,
  Image as ImageIcon,
  Video,
  Send,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSocialConnections, type SocialConnection } from '@/hooks/useSocialConnections';
import { useScheduledPosts, type CreateScheduledPostInput } from '@/hooks/useScheduledPosts';
import type { Database } from '@/integrations/supabase/types';

type SocialPlatform = Database['public']['Enums']['social_platform'];

interface SchedulePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  editorialContentId?: string;
  defaultCaption?: string;
  defaultHashtags?: string[];
}

const MAX_CAPTION_LENGTH = 2200;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function SchedulePostModal({
  open,
  onOpenChange,
  clientId,
  editorialContentId,
  defaultCaption = '',
  defaultHashtags = [],
}: SchedulePostModalProps) {
  const { connections, isLoading: isLoadingConnections } = useSocialConnections(clientId);
  const { createScheduledPost } = useScheduledPosts(editorialContentId, clientId);

  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [caption, setCaption] = useState(defaultCaption);
  const [hashtags, setHashtags] = useState(defaultHashtags.join(' '));
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter only Instagram and Facebook connections
  const availableConnections = (connections ?? []).filter(
    (c) => c.platform === 'instagram' || c.platform === 'facebook'
  );

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo ${file.name} é muito grande. Máximo 50MB.`);
        return;
      }
    }

    setMediaFiles((prev) => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setMediaPreviewUrls((prev) => [...prev, url]);
    });
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviewUrls[index]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMediaFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of mediaFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('social-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Erro ao fazer upload de ${file.name}`);
      }

      const { data: urlData } = supabase.storage
        .from('social-media')
        .getPublicUrl(data.path);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSchedule = async (publishNow = false) => {
    if (selectedPlatforms.length === 0) {
      toast.error('Selecione pelo menos uma plataforma');
      return;
    }

    if (mediaFiles.length === 0) {
      toast.error('Adicione pelo menos uma mídia');
      return;
    }

    if (!scheduledDate && !publishNow) {
      toast.error('Selecione uma data');
      return;
    }

    setIsUploading(true);

    try {
      // Upload media files
      const mediaUrls = await uploadMediaFiles();

      // Create scheduled time
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledAt = publishNow
        ? new Date()
        : new Date(scheduledDate!);
      
      if (!publishNow) {
        scheduledAt.setHours(hours, minutes, 0, 0);
      }

      // Parse hashtags
      const hashtagsArray = hashtags
        .split(/[\s,]+/)
        .filter((tag) => tag.trim())
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      // Create post for each selected platform
      const promises = selectedPlatforms.map((platform) => {
        const input: CreateScheduledPostInput = {
          client_id: clientId,
          editorial_content_id: editorialContentId,
          platform,
          post_type: mediaFiles[0]?.type.startsWith('video') ? 'video' : 'image',
          media_urls: mediaUrls,
          caption: caption || undefined,
          hashtags: hashtagsArray.length > 0 ? hashtagsArray : undefined,
          scheduled_at: scheduledAt.toISOString(),
        };
        return createScheduledPost.mutateAsync(input);
      });

      await Promise.all(promises);

      // Reset form and close modal
      setSelectedPlatforms([]);
      setCaption('');
      setHashtags('');
      setMediaFiles([]);
      setMediaPreviewUrls([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast.error('Erro ao agendar post');
    } finally {
      setIsUploading(false);
    }
  };

  const getConnectionIcon = (platform: SocialPlatform) => {
    return platform === 'instagram' ? Instagram : Facebook;
  };

  const getConnectionColor = (platform: SocialPlatform) => {
    return platform === 'instagram' 
      ? 'text-pink-600 bg-pink-100 dark:bg-pink-900/30' 
      : 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Publicação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Plataformas</Label>
            {isLoadingConnections ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando conexões...
              </div>
            ) : availableConnections.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
                <p>Nenhuma rede social conectada.</p>
                <p className="text-sm">Conecte o Instagram ou Facebook na página de Redes Sociais.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableConnections.map((connection) => {
                  const Icon = getConnectionIcon(connection.platform);
                  const isSelected = selectedPlatforms.includes(connection.platform);
                  return (
                    <button
                      key={connection.id}
                      type="button"
                      onClick={() => togglePlatform(connection.platform)}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg', getConnectionColor(connection.platform))}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">{connection.platform}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {connection.platform_username || connection.page_name || 'Conectado'}
                        </p>
                      </div>
                      <Checkbox checked={isSelected} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Media Upload */}
          <div className="space-y-3">
            <Label>Mídia</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste ou clique para upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Imagem ou Vídeo (até 50MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {mediaPreviewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediaPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    {mediaFiles[index]?.type.startsWith('video') ? (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Legenda</Label>
              <span className={cn(
                "text-xs",
                caption.length > MAX_CAPTION_LENGTH ? "text-destructive" : "text-muted-foreground"
              )}>
                {caption.length}/{MAX_CAPTION_LENGTH}
              </span>
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a legenda do post..."
              rows={4}
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#marketing #vendas #2026"
            />
            {hashtags && (
              <div className="flex flex-wrap gap-1">
                {hashtags.split(/[\s,]+/).filter(Boolean).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {scheduledDate
                      ? format(scheduledDate, "dd 'de' MMMM", { locale: ptBR })
                      : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    locale={ptBR}
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Hora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleSchedule(false)}
            disabled={isUploading || selectedPlatforms.length === 0 || mediaFiles.length === 0}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Agendar
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSchedule(true)}
            disabled={isUploading || selectedPlatforms.length === 0 || mediaFiles.length === 0}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publicar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
