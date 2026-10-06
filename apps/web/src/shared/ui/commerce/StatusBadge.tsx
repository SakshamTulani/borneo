import type { ComponentProps, ReactNode } from 'react';
import {
  ArrowUpCircleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleSlashIcon,
  PackageIcon,
  PlugIcon,
  SparklesIcon,
  TimerIcon,
  ZapIcon,
} from 'lucide-react';
import { Badge } from '@/shared/ui/base/badge';

type Tone = NonNullable<ComponentProps<typeof Badge>['variant']>;

export type StatusBadgeProps =
  | {
      kind:
        | 'inStock'
        | 'outOfStock'
        | 'preorder'
        | 'flashSale'
        | 'newLaunch'
        | 'upgradeAvailable'
        | 'bundle';
    }
  /** Only from a real stock cap (D-140). */
  | { kind: 'lowStock'; count: number }
  /** Only from a filled structured attribute (D-22). */
  | { kind: 'worksWith'; ecosystem: string };

function spec(props: StatusBadgeProps): { tone: Tone; icon: ReactNode; label: string } {
  switch (props.kind) {
    case 'inStock':
      return { tone: 'success', icon: <CheckCircle2Icon />, label: 'In stock' };
    case 'lowStock':
      return { tone: 'warning', icon: <TimerIcon />, label: `Only ${props.count} left` };
    case 'outOfStock':
      return { tone: 'neutral', icon: <CircleSlashIcon />, label: 'Out of stock' };
    case 'preorder':
      return { tone: 'info', icon: <CalendarClockIcon />, label: 'Pre-order' };
    case 'flashSale':
      return { tone: 'offer', icon: <ZapIcon />, label: 'Flash sale' };
    case 'newLaunch':
      return { tone: 'brand', icon: <SparklesIcon />, label: 'New' };
    case 'upgradeAvailable':
      return { tone: 'brand', icon: <ArrowUpCircleIcon />, label: 'Upgrade available' };
    case 'bundle':
      return { tone: 'offer', icon: <PackageIcon />, label: 'Bundle' };
    case 'worksWith':
      return { tone: 'outline', icon: <PlugIcon />, label: `Works with ${props.ecosystem}` };
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const { tone, icon, label } = spec(props);
  return (
    <Badge variant={tone} className="[&>svg]:size-3.5">
      <span aria-hidden className="contents">
        {icon}
      </span>
      {label}
    </Badge>
  );
}
