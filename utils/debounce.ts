export const debounce = (fn: (...args: any[]) => void, wait: number) => {
  let timeout: number | NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}
