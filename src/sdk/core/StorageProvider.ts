export interface StorageProvider {
  /**
   * Retrieves an item from storage.
   * @param key The storage key.
   * @returns A promise that resolves to the value or null if not found.
   */
  getItem(key: string): Promise<string | null> | string | null

  /**
   * Saves an item to storage.
   * @param key The storage key.
   * @param value The value to save.
   */
  setItem(key: string, value: string): Promise<void> | void

  /**
   * Removes an item from storage.
   * @param key The storage key.
   */
  removeItem(key: string): Promise<void> | void
}
