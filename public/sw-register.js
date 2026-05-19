// Service Worker registration — moved from index.html inline script for CSP compliance.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/WoodworkingShop/sw.js');
  });
}
