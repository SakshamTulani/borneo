import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'pending_payment',
  'paid',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;
