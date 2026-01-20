import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FolderPlus, 
  Calendar,
  Instagram,
  Facebook,
  FileText,
  Mail,
  Megaphone,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CreateCampaignData } from '@/hooks/useEditorialCampaigns';

interface CampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  selectedClientId?: string;
  onSave: (data: CreateCampaignData) => void;
  isLoading?: boolean;
}

interface ContentTypeCount {
  type: 'instagram' | 'facebook' | 'blog' | 'email' | 'google_ads';
  label: string;
  icon: typeof Instagram;
  color: string;
  count: number;
}

export function CampaignModal({
  open,
  onOpenChange,
  clients,
  selectedClientId,
  onSave,
  isLoading = false,
}: CampaignModalProps) {
  const [clientId, setClientId] = useState(selectedClientId || '');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [contentCounts, setContentCounts] = useState<ContentTypeCount[]>([
    { type: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600', count: 0 },
    { type: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600', count: 0 },
    { type: 'blog', label: 'Blog', icon: FileText, color: 'text-emerald-600', count: 0 },
    { type: 'email', label: 'Email Marketing', icon: Mail, color: 'text-amber-600', count: 0 },
    { type: 'google_ads', label: 'Google Ads', icon: Megaphone, color: 'text-orange-600', count: 0 },
  ]);

  const updateCount = (type: string, delta: number) => {
    setContentCounts(prev => 
      prev.map(item => 
        item.type === type 
          ? { ...item, count: Math.max(0, item.count + delta) }
          : item
      )
    );
  };

  const totalContents = contentCounts.reduce((sum, item) => sum + item.count, 0);

  const isValid = 
    clientId && 
    name.trim() && 
    startDate && 
    endDate && 
    startDate <= endDate &&
    totalContents > 0;

  const handleSubmit = () => {
    if (!isValid || !startDate || !endDate) return;

    const data: CreateCampaignData = {
      client_id: clientId,
      name: name.trim(),
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      notes: notes.trim() || undefined,
      instagram_count: contentCounts.find(c => c.type === 'instagram')?.count || 0,
      facebook_count: contentCounts.find(c => c.type === 'facebook')?.count || 0,
      blog_count: contentCounts.find(c => c.type === 'blog')?.count || 0,
      email_count: contentCounts.find(c => c.type === 'email')?.count || 0,
      google_ads_count: contentCounts.find(c => c.type === 'google_ads')?.count || 0,
    };

    onSave(data);
  };

  const resetForm = () => {
    setClientId(selectedClientId || '');
    setName('');
    setStartDate(undefined);
    setEndDate(undefined);
    setNotes('');
    setContentCounts(prev => prev.map(item => ({ ...item, count: 0 })));
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Nova Campanha
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nome da Campanha</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Black Friday 2026"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Content Counts */}
          <div className="space-y-2">
            <Label>Conteúdos da Campanha</Label>
            <div className="border rounded-lg p-3 space-y-2">
              {contentCounts.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', item.color)} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCount(item.type, -1)}
                        disabled={item.count === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.count}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCount(item.type, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t mt-2 text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">{totalContents}</span> conteúdo(s)
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Briefing ou observações sobre a campanha..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Criando...' : 'Criar Campanha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
