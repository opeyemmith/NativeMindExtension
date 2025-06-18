import * as CSS from 'csstype'

import { IconName } from '@/entrypoints/content/utils/markdown/content'

interface BaseMessage {
  role: string
  done: boolean
  id: string
  isDefault?: boolean // is default message (like quick actions)
}

export interface SystemMessageV1 extends BaseMessage {
  role: 'system'
  content: string
}

export interface UserMessageV1 extends BaseMessage {
  role: 'user'
  content: string
  timestamp: number
}

export interface AssistantMessageV1 extends BaseMessage {
  role: 'assistant'
  content: string
  reasoning?: string
  reasoningTime?: number
  isError?: boolean
  timestamp?: number
  style?: {
    backgroundColor?: CSS.Property.BackgroundColor
  }
}

export interface TaskMessageV1 extends BaseMessage {
  role: 'task'
  content: string
  timestamp: number
  icon?: IconName
  subTasks?: TaskMessageV1[]
}

export type ActionV1 = {
  customInput: { prompt: string }
}

export type ActionTypeV1 = keyof ActionV1

export interface ActionMessageV1<ActionType extends ActionTypeV1 = ActionTypeV1> extends BaseMessage {
  role: 'action'
  title?: string
  actions: {
    type: ActionType
    data: ActionV1[ActionType]
    content: string
    icon?: IconName
  }[]
  timestamp: number
}

export type HistoryItemV1 = UserMessageV1 | AssistantMessageV1 | TaskMessageV1 | SystemMessageV1 | ActionMessageV1
export type Role = HistoryItemV1['role']

export function pickByRoles<R extends Role[], Item extends { role: Role }>(arr: Item[], roles: R): (Item & { role: R[number] })[] {
  return arr.filter((item) => roles.includes(item.role)) as (Item & { role: R[number] })[]
}

export function isRoleMessage(item: HistoryItemV1, role: Role): item is HistoryItemV1 & { role: Role } {
  return item.role === role
}
