import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '' || typeof value === 'string' && value.trim() === '') return '';
  // Remove existing commas for parsing and then format
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US').format(num);
}

export function parseFormattedNumber(value: string | undefined | null): number {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}
