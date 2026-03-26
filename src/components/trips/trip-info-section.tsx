
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface TripInfoSectionProps {
    icon: LucideIcon;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function TripInfoSection({ icon: Icon, title, children, className }: TripInfoSectionProps) {
    return (
        <div className={cn("flex gap-4", className)}>
            <div className="pt-1">
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
                <p className="text-xs text-muted-foreground">{title}</p>
                <div>{children}</div>
            </div>
        </div>
    );
}
