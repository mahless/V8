import { 
  saveDataLocally, 
  loadLocalData, 
  addToSyncQueue, 
  getSyncQueue, 
  removeSyncQueueItem, 
  updateSyncQueueItem,
  isOnline 
} from './offlineStorage';

export const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwFfRhRgYTeI-5214YHFGqe-5xN4s6kqu6Sh1yF0f2UTfv_gLu1Ho99_3c8Op0N84A/exec';

/**
 * Fetch all data from Google Sheets API.
 * On success: caches data locally in localStorage.
 * On failure (offline): returns last cached data from localStorage.
 */
export async function fetchAllData(): Promise<{ success: boolean; data: Record<string, any[]> | null; fromCache?: boolean }> {
  // If online, try fetching from the API first
  if (isOnline()) {
    try {
      const url = new URL(GOOGLE_SHEETS_API_URL);
      url.searchParams.append('t', Date.now().toString());

      const response = await fetch(url.toString(), {
        redirect: "follow",
        cache: "no-store",
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();

      // Cache the data locally on successful fetch
      if (result.success && result.data) {
        saveDataLocally(result.data);
      }

      return result;
    } catch (error) {
      console.warn('[GoogleSheets] Online fetch failed, falling back to local cache:', error);
      // Fall through to local cache
    }
  }

  // Offline or fetch failed → load from localStorage
  const localData = loadLocalData();
  if (localData) {
    console.info('[GoogleSheets] Loaded data from local cache (offline mode)');
    return { success: true, data: localData as unknown as Record<string, any[]>, fromCache: true };
  }

  // No cached data available at all
  console.error('[GoogleSheets] No internet and no cached data available');
  return { success: false, data: null };
}

/**
 * Send an action to the Google Sheets API.
 * If online: sends immediately.
 * If offline: queues the action for later sync.
 * 
 * Returns { success: true } in both cases so the UI can proceed.
 */
export async function sendAction(
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC_PROCESS_SALE' | 'RPC_CANCEL_SALE', 
  payload: any
): Promise<{ success: boolean; error?: string; queued?: boolean }> {
  if (isOnline()) {
    try {
      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action,
          ...payload
        }),
        redirect: 'follow',
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Unknown error from Sheets API');
      }
      return result;
    } catch (error) {
      console.warn(`[GoogleSheets] Failed to send ${action} online, queuing for later:`, error);
      // Queue for later sync
      addToSyncQueue(action, payload);
      return { success: true, queued: true };
    }
  }

  // Offline → queue the action
  addToSyncQueue(action, payload);
  console.info(`[GoogleSheets] Queued ${action} for offline sync`);
  return { success: true, queued: true };
}

/**
 * Sync all pending actions in the queue.
 * Executes them sequentially in order.
 * Returns the count of successfully synced items.
 */
export async function syncPendingActions(): Promise<{ synced: number; failed: number; remaining: number }> {
  if (!isOnline()) {
    const queue = getSyncQueue();
    return { synced: 0, failed: 0, remaining: queue.length };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: item.action,
          ...item.payload
        }),
        redirect: 'follow',
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();

      if (result.success) {
        removeSyncQueueItem(item.id);
        synced++;
      } else {
        // Increment retries, remove if too many
        if (item.retries >= 3) {
          console.error(`[SyncQueue] Removing item ${item.id} after 3 failed retries`);
          removeSyncQueueItem(item.id);
          failed++;
        } else {
          updateSyncQueueItem(item.id, { retries: item.retries + 1 });
          failed++;
        }
      }
    } catch (error) {
      console.warn(`[SyncQueue] Failed to sync item ${item.id}:`, error);
      if (item.retries >= 3) {
        removeSyncQueueItem(item.id);
        failed++;
      } else {
        updateSyncQueueItem(item.id, { retries: item.retries + 1 });
        failed++;
      }
      // If we lost connection mid-sync, stop trying
      if (!isOnline()) break;
    }
  }

  const remaining = getSyncQueue().length;
  return { synced, failed, remaining };
}
