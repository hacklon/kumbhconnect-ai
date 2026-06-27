'use client';

import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function OfflineSyncManager() {
  const { isOnline, setOfflineReportsCount } = useApp();

  useEffect(() => {
    // 1. Register PWA Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('SW: Registered successfully with scope:', reg.scope))
          .catch((err) => console.error('SW: Registration failed:', err));
      });
    }

    // 2. Initialize IndexedDB structure
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      const request = indexedDB.open('KumbhConnectOffline', 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'id' });
        }
      };
      request.onerror = (e) => console.error('IndexedDB initialization failed:', e);
    }
  }, []);

  // 3. Reconnect Listener: Auto-sync queued reports when connection resumes
  useEffect(() => {
    if (isOnline) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  const syncOfflineQueue = async () => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;

    const request = indexedDB.open('KumbhConnectOffline', 1);
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction('reports', 'readwrite');
      const store = transaction.objectStore('reports');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = async () => {
        const queuedReports = getAllRequest.result;
        if (queuedReports.length === 0) return;

        console.log(`SW Sync: Detected ${queuedReports.length} queued reports. Syncing...`);

        for (const report of queuedReports) {
          try {
            const res = await fetch(report.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(report.payload)
            });
            const data = await res.json();
            if (data.success) {
              // Delete synchronized report from IndexedDB
              const deleteTx = db.transaction('reports', 'readwrite');
              const deleteStore = deleteTx.objectStore('reports');
              deleteStore.delete(report.id);
              console.log(`SW Sync: Successfully synced report ID ${report.id}`);
            }
          } catch (err) {
            console.error(`SW Sync: Failed syncing report ID ${report.id}. Retrying later.`, err);
          }
        }

        // Re-read queue count to update badge
        const countTx = db.transaction('reports', 'readonly');
        const countStore = countTx.objectStore('reports');
        const countReq = countStore.count();
        countReq.onsuccess = () => {
          setOfflineReportsCount(countReq.result);
        };
      };
    };
  };

  return null; // Silent tracker utility
}
