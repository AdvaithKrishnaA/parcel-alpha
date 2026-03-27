import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SyncClient, SyncState } from '@app/sync';
import { Item } from '@app/types';
import { generateId } from '@app/crypto';

// In this simplified version, bundles are represented as a record of { id: { name, items, created_at } }
export interface AppBundle {
  id: string;
  name: string | null;
  items: Item[];
  created_at: number;
}

interface AppContextType {
  bundles: AppBundle[];
  syncClient: SyncClient;
  passwordMode: boolean;
  setPasswordMode: (mode: boolean) => void;
  loadSync: (password: string) => Promise<boolean>;
  saveBundle: (bundle: AppBundle) => void;
  deleteBundle: (id: string) => void;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [bundles, setBundles] = useState<AppBundle[]>([]);
  const [passwordMode, setPasswordMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Read API URL from env, fallback to relative or localhost
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787';
  const [syncClient] = useState(() => new SyncClient(apiUrl));

  // local storage key for standard (non-sync) bundles
  const LOCAL_STORAGE_KEY = 'parcel_local_bundles';

  useEffect(() => {
    if (!passwordMode) {
      // Load from local storage
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          setBundles(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse local bundles", e);
        }
      }
    }
  }, [passwordMode]);

  const loadSync = async (password: string): Promise<boolean> => {
    try {
      setIsSyncing(true);

      const { deriveMasterKey } = await import('@app/crypto');
      const masterKey = await deriveMasterKey(password);
      await syncClient.setMasterKey(masterKey);

      const state = await syncClient.load();
      if (state && state.bundles) {
        // Convert map to array
        const loadedBundles = Object.values(state.bundles) as AppBundle[];
        setBundles(loadedBundles);
      } else {
        setBundles([]);
      }
      setPasswordMode(true);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncState = () => {
    if (passwordMode) {
      setIsSyncing(true);
      const state: SyncState = {
        version: 1,
        bundles: bundles.reduce((acc, b) => ({ ...acc, [b.id]: b }), {}),
        updated_at: Date.now()
      };
      syncClient.debouncedSave(state, () => setIsSyncing(false), () => setIsSyncing(false));
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bundles));
    }
  };

  // Ensure syncState is called when bundles change, but we need to handle it carefully.
  // A better way is to call it inside the modification functions.

  const saveBundle = (bundle: AppBundle) => {
    setBundles(prev => {
      const existing = prev.find(b => b.id === bundle.id);
      const next = existing
        ? prev.map(b => b.id === bundle.id ? bundle : b)
        : [...prev, bundle];

      if (passwordMode) {
        setIsSyncing(true);
        const state: SyncState = {
          version: 1,
          bundles: next.reduce((acc, b) => ({ ...acc, [b.id]: b }), {}),
          updated_at: Date.now()
        };
        syncClient.debouncedSave(state, () => setIsSyncing(false), () => setIsSyncing(false));
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  };

  const deleteBundle = (id: string) => {
    setBundles(prev => {
      const next = prev.filter(b => b.id !== id);

      if (passwordMode) {
        setIsSyncing(true);
        const state: SyncState = {
          version: 1,
          bundles: next.reduce((acc, b) => ({ ...acc, [b.id]: b }), {}),
          updated_at: Date.now()
        };
        syncClient.debouncedSave(state, () => setIsSyncing(false), () => setIsSyncing(false));
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }

  return (
    <AppContext.Provider value={{
      bundles,
      syncClient,
      passwordMode,
      setPasswordMode,
      loadSync,
      saveBundle,
      deleteBundle,
      isSyncing
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
