// ── Offline Synchronization & Local Draft Persistence ──────────────────
import { api } from './api';

export interface QueuedSyncAction {
  idempotency_key: string;
  action_type: string;
  payload: Record<string, unknown>;
  client_timestamp: string;
  retry_count: number;
}

const DRAFT_PREFIX = 'cc_draft_';
const QUEUE_KEY = 'cc_offline_sync_queue';

function getStoredQueue(): QueuedSyncAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredQueue(queue: QueuedSyncAction[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // LocalStorage write failed (e.g. quota exceeded)
  }
}

export const offlineSync = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  // Save coding draft locally (safe against browser reload or connection drop)
  saveDraft(challengeId: string, language: string, sourceCode: string): void {
    try {
      const key = `${DRAFT_PREFIX}${challengeId}_${language}`;
      localStorage.setItem(key, JSON.stringify({
        sourceCode,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // Storage unavailable
    }
  },

  // Restore coding draft if present
  getDraft(challengeId: string, language: string): string | null {
    try {
      const key = `${DRAFT_PREFIX}${challengeId}_${language}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.sourceCode || null;
    } catch {
      return null;
    }
  },

  // Enqueue user action for idempotent synchronization
  enqueueAction(actionType: string, payload: Record<string, unknown>): string {
    const idempotencyKey = `cc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const action: QueuedSyncAction = {
      idempotency_key: idempotencyKey,
      action_type: actionType,
      payload,
      client_timestamp: new Date().toISOString(),
      retry_count: 0,
    };
    const queue = getStoredQueue();
    queue.push(action);
    saveStoredQueue(queue);

    // If online, attempt background flush
    if (this.isOnline()) {
      this.flushQueue().catch(() => {});
    }
    return idempotencyKey;
  },

  // Process and transmit queued actions to server safely
  async flushQueue(): Promise<number> {
    const queue = getStoredQueue();
    if (queue.length === 0) return 0;

    try {
      const payload = {
        actions: queue.map(a => ({
          idempotency_key: a.idempotency_key,
          action_type: a.action_type,
          payload: a.payload,
          client_timestamp: a.client_timestamp,
        })),
      };

      const res = await api.sync.batch(payload);
      // Remove successfully applied or duplicate items
      const processedKeys = new Set(
        res.results.filter(r => r.status === 'applied' || r.status === 'duplicate').map(r => r.idempotency_key)
      );

      const remaining = queue.filter(a => !processedKeys.has(a.idempotency_key));
      saveStoredQueue(remaining);
      return res.synced_count;
    } catch (err) {
      console.warn('Offline sync flush failed; actions remain queued:', err);
      return 0;
    }
  },
};

// Auto-register network listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineSync.flushQueue().catch(() => {});
  });
}
