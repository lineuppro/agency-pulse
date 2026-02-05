import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetaAdsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  loading?: boolean;
}

export function MetaAdsCard({ title, value, icon: Icon, description, loading }: MetaAdsCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {loading ? (
            <div className="h-8 w-24 animate-pulse bg-muted rounded" />
          ) : (
            value
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
