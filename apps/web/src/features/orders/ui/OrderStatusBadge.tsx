import type { OrderStatus } from '@borneo/shared';
import { Badge } from '@/shared/ui/base/badge';
import { STATUS_LABELS, statusTone } from '../mappers/orderText';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={statusTone(status)}>{STATUS_LABELS[status]}</Badge>;
}
