// Tab-local UI preferences only. Document contents always come from the library.
export function readViewState(key, fallback, valid, storage, path = globalThis.location?.pathname || '/') {
  try {
    const value = JSON.parse((storage ?? globalThis.sessionStorage).getItem(`brain:view:v1:${path}:${key}`));
    return valid(value) ? value : fallback;
  } catch { return fallback; }
}

export function writeViewState(key, value) {
  try { sessionStorage.setItem(`brain:view:v1:${location.pathname}:${key}`, JSON.stringify(value)); }
  catch { /* Disabled or full storage must never prevent reading. */ }
}

export const validSize = value => value && Number.isFinite(value.width) && value.width >= 320
  && Number.isFinite(value.height) && value.height >= 240;
export const validCluster = value => value === null || Boolean(value && typeof value.owner === 'string'
  && (value.value === null || (value.value && (
    typeof value.value.category === 'string' || typeof value.value.tag === 'string'
    || (typeof value.value.document === 'string' && [undefined, 'incoming', 'outgoing'].includes(value.value.direction))))));
