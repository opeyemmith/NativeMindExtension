import { createI18n, useI18n as _useI18n } from 'vue-i18n'

import en from '@/locales/en.json'

// Type-define 'en-US' as the master schema for the resource
type MessageSchema = typeof en

export const i18n = createI18n<[MessageSchema], 'en'>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
  },
})

export function useI18n() {
  return _useI18n<{ message: MessageSchema }, 'en'>()
}
