import '@testing-library/jest-dom/vitest'

// jsdom localStorage polyfill for environments where it is missing.
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(String(k), String(v))
    },
    removeItem: (k) => {
      store.delete(String(k))
    },
    clear: () => {
      store.clear()
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    }
  }
}
