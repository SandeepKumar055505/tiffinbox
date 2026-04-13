import { db } from '../config/db';

/**
 * Singleton service for caching app settings in memory.
 * Reduces database round-trips for common policy checks.
 */
class SettingsService {
  private cache: any = null;
  private lastFetch: number = 0;
  private readonly TTL = 60 * 1000; // 1 minute cache
  private isFetching = false;

  async getSettings() {
    const now = Date.now();
    
    // Return cache if valid and not currently fetching
    if (this.cache && (now - this.lastFetch < this.TTL)) {
      return this.cache;
    }

    // Prevent multiple concurrent fetches from hitting the DB
    if (this.isFetching && this.cache) {
      return this.cache;
    }

    return this.refresh();
  }

  async refresh() {
    this.isFetching = true;
    try {
      const settings = await db('app_settings').where({ id: 1 }).first();
      if (settings) {
        this.cache = settings;
        this.lastFetch = Date.now();
      }
      return this.cache;
    } catch (err: any) {
      console.error('[SettingsService] Failed to fetch settings:', err.message);
      // Fallback to cache if available, otherwise return empty
      return this.cache || {};
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Clears the cache. Call this after updating settings in the admin dashboard.
   */
  clearCache() {
    this.cache = null;
    this.lastFetch = 0;
  }
}

export const settingsService = new SettingsService();
