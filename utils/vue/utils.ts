import { twMerge } from 'tailwind-merge'
import { normalizeClass } from 'vue'

export type ComponentClassAttr = undefined | null | string | string[] | Record<string, boolean> | ComponentClassAttr[]

export function classNames(...cls: ComponentClassAttr[]) {
  return twMerge(normalizeClass(cls))
}
