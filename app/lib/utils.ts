import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Custom @theme font sizes — must be registered so twMerge does not treat them as text colors. */
const customFontSizes = [
  'micro',
  'body-xs',
  'body-sm',
  'body-md',
  'body-lg',
  'body-xl',
  'overline-xs',
  'overline-sm',
  'overline-md',
  'overline-lg',
  'title-xs',
  'title-sm',
  'title-sm-lg',
  'title-md',
  'title-md-lg',
  'title-lg',
  'title-lg-lg',
  'title-xl',
  'title-xl-md',
  'title-xl-lg',
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{text: [...customFontSizes]}],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
