// Lightweight in-memory shim for @react-native-async-storage/async-storage for web builds.
// Satisfies imports from dependencies like @metamask/sdk without pulling React Native.

const store = new Map<string, string>();

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? store.get(key)! : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  async getAllKeys(): Promise<string[]> {
    return Array.from(store.keys());
  },
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return keys.map((key) => [key, store.has(key) ? store.get(key)! : null]);
  },
  async multiSet(entries: [string, string][]): Promise<void> {
    entries.forEach(([key, value]) => store.set(key, value));
  },
  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach((key) => store.delete(key));
  },
};

export default AsyncStorage;

export const useAsyncStorage = (key: string) => ({
  getItem: () => AsyncStorage.getItem(key),
  setItem: (value: string) => AsyncStorage.setItem(key, value),
  removeItem: () => AsyncStorage.removeItem(key),
});