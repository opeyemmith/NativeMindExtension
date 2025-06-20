export const settingsScrollTargets = [
  'quick-actions-block',
  'model-download-section',
  'server-address-section',
] as const

export type SettingsScrollTarget = typeof settingsScrollTargets[number]
