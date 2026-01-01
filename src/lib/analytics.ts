export function sendEvent(event: string, payload: any = {}) {
  // Lightweight analytics shim: console + gtag if present
  try {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, payload);
    }
  } catch (e) {
    // ignore
  }
  console.info('[analytics]', event, payload);
}
