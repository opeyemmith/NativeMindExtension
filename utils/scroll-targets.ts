export const settingsScrollTargets = [
  'quick-actions-block',
  'model-download-section',
  'server-address-section',
  'openrouter-config-section',
] as const

export type SettingsScrollTarget = typeof settingsScrollTargets[number]
