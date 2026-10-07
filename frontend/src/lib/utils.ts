import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// 条件付きclassNameを結合し、Tailwindの競合するユーティリティを後勝ちで整理する。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
