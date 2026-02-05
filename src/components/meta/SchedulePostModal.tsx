import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Instagram, Facebook, Image, Video, Layers, Play, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useScheduledPosts, MetaPlatform, MetaPostType, CreateScheduledPostInput } from '@/hooks/useScheduledPosts';
import { useMetaConnection } from '@/hooks/useMetaConnection';

interface SchedulePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  editorialContentId?: string;
  initialCaption?: string;
  initialHashtags?: string[];
}

const postTypeIcons = {
  image: Image,
  video: Video,
  carousel: Layers,
  reel: Play,
  story: Play,
};

export function SchedulePostModal({
  open,
  onOpenChange,
  clientId,
  editorialContentId,
  initialCaption = '',
  initialHashtags = [],
}: SchedulePostModalProps) {
  const { connection } = useMetaConnection(clientId);
  const { createPost } = useScheduledPosts(clientId);
  
  const [platform, setPlatform] = useState<{ instagram: boolean; facebook: boolean }>({
    instagram: true,
    facebook: false,
  });
  const [postType, setPostType] = useState<MetaPostType>('image');
  const [mediaUrls, setMediaUrls] = useState<string[]>(['']);
  const [caption, setCaption] = useState(initialCaption);
  const [hashtags, setHashtags] = useState(initialHashtags.join(' '));
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [submitting, setSubmitting] = useState(false);

  const handleMediaUrlChange = (index: number, value: string) => {
    const newUrls = [...mediaUrls];
    newUrls[index] = value;
    setMediaUrls(newUrls);
  };

  const addMediaUrl = () => {
    if (mediaUrls.length < 10) {
      setMediaUrls([...mediaUrls, '']);
    }
  };

  const removeMediaUrl = (index: number) => {
    const newUrls = mediaUrls.filter((_, i) => i !== index);
    setMediaUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const handleSubmit = async () => {
    if (!scheduledDate) return;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduledAt = new Date(scheduledDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    let selectedPlatform: MetaPlatform = 'instagram';
    if (platform.instagram && platform.facebook) {
      selectedPlatform = 'both';
    } else if (platform.facebook) {
      selectedPlatform = 'facebook';
    }

    const hashtagsArray = hashtags
      .split(/[\s,]+/)
      .map(h => h.startsWith('#') ? h : `#${h}`)
      .filter(h => h.length > 1);

    const input: CreateScheduledPostInput = {
      client_id: clientId,
      editorial_content_id: editorialContentId,
      platform: selectedPlatform,
      post_type: postType,
      media_urls: mediaUrls.filter(url => url.trim()),
      caption: caption || undefined,
      hashtags: hashtagsArray.length > 0 ? hashtagsArray : undefined,
      scheduled_at: scheduledAt.toISOString(),
    };

    setSubmitting(true);
    const result = await createPost(input);
    setSubmitting(false);

    if (result) {
      onOpenChange(false);
      // Reset form
      setPlatform({ instagram: true, facebook: false });
      setPostType('image');
      setMediaUrls(['']);
      setCaption('');
      setHashtags('');
      setScheduledDate(undefined);
      setScheduledTime('12:00');
    }
  };

  const isValid = 
    (platform.instagram || platform.facebook) &&
    mediaUrls.some(url => url.trim()) &&
    scheduledDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Publicação</DialogTitle>
        </DialogHeader>

        {!connection && (
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="py-3">
              <p className="text-sm text-warning">
                Conecte uma conta Meta para agendar publicações.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="instagram"
                  checked={platform.instagram}
                  onCheckedChange={(checked) => 
                    setPlatform(p => ({ ...p, instagram: !!checked }))
                  }
                  disabled={!connection?.instagram_account_id}
                />
                <label htmlFor="instagram" className="flex items-center gap-2 cursor-pointer">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="facebook"
                  checked={platform.facebook}
                  onCheckedChange={(checked) => 
                    setPlatform(p => ({ ...p, facebook: !!checked }))
                  }
                  disabled={!connection?.facebook_page_id}
                />
                <label htmlFor="facebook" className="flex items-center gap-2 cursor-pointer">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </label>
              </div>
            </div>
          </div>

          {/* Post Type */}
          <div className="space-y-2">
            <Label>Tipo de Post</Label>
            <Select value={postType} onValueChange={(v) => setPostType(v as MetaPostType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Imagem
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Vídeo
                  </div>
                </SelectItem>
                <SelectItem value="carousel">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Carrossel
                  </div>
                </SelectItem>
                <SelectItem value="reel">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Reels
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Media URLs */}
          <div className="space-y-2">
            <Label>URLs das Mídias</Label>
            <div className="space-y-2">
              {mediaUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`URL da ${postType === 'video' || postType === 'reel' ? 'vídeo' : 'imagem'} ${index + 1}`}
                    value={url}
                    onChange={(e) => handleMediaUrlChange(index, e.target.value)}
                  />
                  {mediaUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeMediaUrl(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {postType === 'carousel' && mediaUrls.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={addMediaUrl}>
                + Adicionar mídia
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Use URLs públicas de imagens/vídeos hospedados (ex: Cloudinary, S3)
            </p>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label>Legenda</Label>
            <Textarea
              placeholder="Escreva a legenda do post..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {caption.length}/2200 caracteres
            </p>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input
              placeholder="#marketing #digital #2026"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || !connection || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              'Agendar Post'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
