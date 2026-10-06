import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Our type scale (index.css @theme) adds font sizes tailwind-merge can't infer; without this it
// would treat `text-tagline` as a colour and keep a conflicting `text-sm`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['tagline', 'headline', 'title', 'display'] }] } },
});

/** Merge Tailwind classes (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
