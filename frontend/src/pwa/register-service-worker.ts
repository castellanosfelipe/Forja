export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  } catch (error) {
    console.error('Service Worker registration failed', error);
    return null;
  }
}
