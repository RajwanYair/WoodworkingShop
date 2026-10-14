export const browserLocalStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem(key) {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  setItem(key, value) {
    globalThis.localStorage?.setItem(key, value);
  },
  removeItem(key) {
    globalThis.localStorage?.removeItem(key);
  },
};
