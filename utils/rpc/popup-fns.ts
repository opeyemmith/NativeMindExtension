import { EventEmitter } from 'events'

const eventEmitter = new EventEmitter()

export const popupFunctions = {} as const

export function registerPopupRpcEvent(ev: string, fn: (...args: any[]) => void) {
  eventEmitter.on(ev, fn)
}
