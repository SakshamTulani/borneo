import type { OptionGroup, ProductDetail, ProductVariant } from '../model';

const buyable = (v: ProductVariant) => v.availability !== 'outOfStock';

/**
 * The variant to show: the one in the URL if it exists, else the first you can buy, else the
 * first. Variants arrive cheapest first.
 */
export function selectedVariant(product: ProductDetail, sku: string | undefined): ProductVariant {
  return (
    product.variants.find((v) => v.sku === sku) ??
    product.variants.find(buyable) ??
    product.variants[0]!
  );
}

/**
 * Switching one option keeps the other choices where such a variant exists, preferring one you
 * can buy.
 */
export function variantFor(
  product: ProductDetail,
  current: ProductVariant,
  key: string,
  value: string,
): ProductVariant {
  const candidates = product.variants.filter((v) => v.options[key] === value);
  const matches = (v: ProductVariant) =>
    Object.entries(current.options).filter(([k, val]) => k !== key && v.options[k] === val).length;
  return [...candidates].sort(
    (a, b) => matches(b) - matches(a) || Number(buyable(b)) - Number(buyable(a)),
  )[0]!;
}

const legend = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

/**
 * Option groups for the variant selectors. Options with no variant you can buy stay visible but
 * disabled (DESIGN: VariantSelector).
 */
export function optionGroups(product: ProductDetail, current: ProductVariant): OptionGroup[] {
  return product.optionKeys.map((key) => {
    const values = [...new Set(product.variants.map((v) => v.options[key]).filter(Boolean))];
    return {
      key,
      legend: legend(key),
      value: current.options[key] ?? '',
      options: values.map((value) => ({
        value: value!,
        label: value!,
        available: product.variants.some((v) => v.options[key] === value && buyable(v)),
      })),
    };
  });
}
