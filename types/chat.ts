import { Base64ImageData } from './image'
import { TabInfo } from './tab'

export type ContextAttachment = { type: 'image', value: Base64ImageData & { id: string, name: string, size?: number } } | { type: 'tab', value: TabInfo }
