/** Watch is on-site only, for out-of-stock catalog products (D-147). */
export function canWatch(availability: 'inStock' | 'outOfStock' | 'preorder'): boolean {
  return availability === 'outOfStock';
}
