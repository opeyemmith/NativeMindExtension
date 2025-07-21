export function extractFileNameFromUrl(url: string, fallback: string) {
  if (url.startsWith('data:')) {
    return fallback
  }
  return new URL(url, window.location.origin).pathname.split('/').pop() ?? fallback
}
