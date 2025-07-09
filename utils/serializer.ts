import { parse, stringify } from 'devalue'

export function serialize(v: unknown) {
  return stringify(v)
}

export function deserialize<T>(v: string): T {
  return parse(v)
}
