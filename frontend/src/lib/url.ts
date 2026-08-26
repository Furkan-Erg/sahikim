export function getRoomCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function setRoomCodeInUrl(code: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('code', code.toUpperCase());
  window.history.replaceState(null, '', url.toString());
}

export function clearRoomCodeFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  window.history.replaceState(null, '', url.pathname + url.search);
}

export function getShareableRoomLink(code: string) {
  const url = new URL(window.location.origin);
  url.searchParams.set('code', code.toUpperCase());
  return url.toString();
}

export function navigateToJoin(code: string) {
  setRoomCodeInUrl(code);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
